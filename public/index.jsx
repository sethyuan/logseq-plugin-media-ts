import "@logseq/libs"

const types = {
  ":bilibili-timestamp": "bilibiliJump",
  ":media-timestamp": "mediaJump",
}

const icon = `<svg fill="currentColor" viewBox="0 0 20 20" class="h-5 w-5"><path clip-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" fill-rule="evenodd"></path></svg>`

const FOLLOWING = 4

async function main() {
  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()

  logseq.App.onMacroRendererSlotted(tsRenderer)

  logseq.Editor.registerSlashCommand(
    "Bilibili timestamp",
    insertBilibiliTsRenderer,
  )
  logseq.Editor.registerSlashCommand("Media timestamp", insertMediaTsRenderer)

  if (logseq.settings?.bilibiliTsShortcut) {
    logseq.App.registerCommandPalette(
      {
        key: "insert-bilibili-ts",
        label:
          lang === "zh-CN" ? "插入Bilibili时间戳" : "Insert Bilibili timestamp",
        keybinding: {
          binding: logseq.settings.bilibiliTsShortcut,
        },
      },
      (e) => {
        insertBilibiliTsRenderer()
      },
    )
  }
  if (logseq.settings?.mediaTsShortcut) {
    logseq.App.registerCommandPalette(
      {
        key: "insert-media-ts",
        label: lang === "zh-CN" ? "插入多媒体时间戳" : "Insert media timestamp",
        keybinding: {
          binding: logseq.settings.mediaTsShortcut,
        },
      },
      (e) => {
        insertMediaTsRenderer()
      },
    )
  }

  console.log("#media-ts loaded")
}

async function tsRenderer({ slot, payload: { arguments: args } }) {
  if (args.length === 0) return
  const type = args[0].trim()
  if (types[type] == null) return

  const timeArg = args[1].trim()
  if (!timeArg) return

  const time = getTimeFromArg(timeArg)
  const timeStr = formatTime(time)
  logseq.provideUI({
    key: type.substring(1),
    slot,
    template: `<a class="kef-media-ts-ts svg-small" data-ts="${time}" data-slot="${slot}" data-on-click="${types[type]}">${icon}${timeStr}</a>`,
  })
}

async function insertBilibiliTsRenderer() {
  await logseq.Editor.insertAtEditingCursor(
    "{{renderer :bilibili-timestamp, 0}}",
  )
  const input = parent.document.activeElement
  const pos = input.selectionStart - 3
  input.setSelectionRange(pos, pos + 1)
}

async function insertMediaTsRenderer() {
  const input = parent.document.activeElement
  const media = findMediaElement(input)
  const currentTime = media?.currentTime ?? 0
  await logseq.Editor.insertAtEditingCursor(
    `{{renderer :media-timestamp, ${currentTime}}}`,
  )
}

function getTimeFromArg(str) {
  const parts = str.split(":")
  switch (parts.length) {
    case 2: {
      const [min, sec] = parts
      return +min * 60 + +sec
    }
    case 3:
      const [hour, min, sec] = parts
      return +hour * 3600 + +min * 60 + +sec
    default:
      return +str
  }
}

function formatTime(secs) {
  const hour = (secs / 3600) >> 0
  const min = ((secs % 3600) / 60) >> 0
  const sec = secs % 60
  if (hour > 0) {
    return `${hour.toString().padStart(2, "0")}:${min
      .toString()
      .padStart(2, "0")}:${sec >= 10 ? sec : "0" + sec}`
  } else {
    return `${min.toString().padStart(2, "0")}:${sec >= 10 ? sec : "0" + sec}`
  }
}

function findMediaElement(refEl) {
  const audioElements = Array.from(
    parent.document.getElementsByTagName("audio"),
  )
  const videoElements = Array.from(
    parent.document.getElementsByTagName("video"),
  )

  let video = null
  let audio = null

  for (let i = audioElements.length - 1; i >= 0; i--) {
    const el = audioElements[i]
    if (el?.compareDocumentPosition(refEl) === FOLLOWING) {
      audio = el
      break
    }
  }
  for (let i = videoElements.length - 1; i >= 0; i--) {
    const el = videoElements[i]
    if (el?.compareDocumentPosition(refEl) === FOLLOWING) {
      video = el
      break
    }
  }

  if (video == null) return audio
  if (audio == null) return video
  if (video.compareDocumentPosition(audio) === FOLLOWING) {
    return audio
  } else {
    return video
  }
}

function findBilibiliIframe(refEl) {
  const iframeElements = Array.from(
    parent.document.getElementsByTagName("iframe"),
  )
  let iframe = null
  for (let i = iframeElements.length - 1; i >= 0; i--) {
    const el = iframeElements[i]
    if (
      el.src.startsWith("https://player.bilibili") &&
      el?.compareDocumentPosition(refEl) === FOLLOWING
    ) {
      iframe = el
      break
    }
  }
  return iframe
}

const model = {
  mediaJump(args) {
    const slotId = args.dataset.slot
    const ts = +args.dataset.ts
    const el = parent.document.getElementById(slotId)
    const media = findMediaElement(el)
    if (media) {
      media.currentTime = ts
    }
  },
  bilibiliJump(args) {
    const slotId = args.dataset.slot
    const ts = args.dataset.ts
    const el = parent.document.getElementById(slotId)
    const iframe = findBilibiliIframe(el)
    if (iframe) {
      iframe.src = `${iframe.src.replace(/&t=[0-9]+(\.[0-9]+)?$/, "")}&t=${ts}`
    }
  },
}

logseq.ready(model, main).catch(console.error)
