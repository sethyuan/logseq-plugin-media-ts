import "@logseq/libs"

const icon = `<svg fill="currentColor" viewBox="0 0 20 20" class="h-5 w-5"><path clip-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" fill-rule="evenodd"></path></svg>`

const Following = 4
const VideoExts = new Set([
  "mp4",
  "mov",
  "mpg",
  "mpeg",
  "webm",
  "ogv",
  "avi",
  "m4v",
])
const AudioExts = new Set(["mp3", "m4a", "wav", "ogg", "aac"])
const LinkRegex = /!?\[(?:\\\]|[^\]])*\]\(((?:\\\)|[^\)])+)\)/

async function main() {
  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()

  logseq.App.onMacroRendererSlotted(tsRenderer)
  logseq.Editor.registerSlashCommand("Media timestamp", insertMediaTsRenderer)
  logseq.App.registerCommandPalette(
    {
      key: "insert-media-ts",
      label: lang === "zh-CN" ? "插入媒体时间戳" : "Insert media timestamp",
      ...(logseq.settings.mediaTsShortcut && {
        keybinding: {
          binding: logseq.settings.mediaTsShortcut,
        },
      }),
    },
    (e) => {
      insertMediaTsRenderer()
    },
  )

  logseq.App.onMacroRendererSlotted(mediaRenderer)
  logseq.Editor.registerSlashCommand("Insert media", async () => {
    await logseq.Editor.insertAtEditingCursor(`{{renderer :media, }}`)
    const input = parent.document.activeElement
    const pos = input.selectionStart - 2
    input.setSelectionRange(pos, pos)
  })

  logseq.Editor.registerBlockContextMenuItem(
    lang === "zh-CN" ? "转换为媒体渲染" : "Convert to media renderer",
    async ({ uuid }) => {
      const block = await logseq.Editor.getBlock(uuid)
      await logseq.Editor.updateBlock(
        uuid,
        `{{renderer :media, ${block.content.replace(LinkRegex, "$1")}}}`,
      )
    },
  )

  logseq.useSettingsSchema([
    {
      key: "mediaTsShortcut",
      type: "string",
      default: "",
      description:
        lang === "zh-CN"
          ? '为生成 media-timestamp 设置快捷键，例如 "mod+shift+m"。'
          : 'Assign a shortcut for media-timestamp operation, e.g. "mod+shift+m".',
    },
  ])

  console.log("#media-ts loaded")
}

async function tsRenderer({ slot, payload: { arguments: args } }) {
  if (args.length === 0) return
  const type = args[0].trim()
  if (type !== ":media-timestamp") return

  const timeArg = args[1].trim()
  if (!timeArg) return

  const time = getTimeFromArg(timeArg)
  const timeStr = formatTime(time)
  logseq.provideUI({
    key: "media-timestamp",
    slot,
    template: `<a class="kef-media-ts-ts svg-small" data-ts="${time}" data-slot="${slot}" data-on-click="mediaJump">${icon}${timeStr}</a>`,
    reset: true,
  })
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
  secs = Math.floor(secs)
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
  return (
    findMediaElementIn(
      parent.document.querySelector(".cards-review"),
      (_el) => true,
    ) ||
    findMediaElementIn(
      parent.document.getElementById("right-sidebar"),
      (_el) => true,
    ) ||
    findMediaElementIn(
      parent.document.getElementById("left-container"),
      (el) => el?.compareDocumentPosition(refEl) === Following,
    )
  )
}

function findMediaElementIn(root, pred) {
  if (root == null) return null

  const iframeElements = Array.from(root.getElementsByTagName("iframe"))
  const videoElements = Array.from(root.getElementsByTagName("video"))
  const audioElements = Array.from(root.getElementsByTagName("audio"))

  let bilibili = null
  let video = null
  let audio = null

  for (let i = iframeElements.length - 1; i >= 0; i--) {
    const el = iframeElements[i]
    if (el.src.startsWith("https://player.bilibili") && pred(el)) {
      bilibili = el
      break
    }
  }
  for (let i = videoElements.length - 1; i >= 0; i--) {
    const el = videoElements[i]
    if (pred(el)) {
      video = el
      break
    }
  }
  for (let i = audioElements.length - 1; i >= 0; i--) {
    const el = audioElements[i]
    if (pred(el)) {
      audio = el
      break
    }
  }

  const elements = [bilibili, video, audio]
  let closest = null
  for (const el of elements) {
    if (el == null) continue
    if (closest == null || closest.compareDocumentPosition(el) === Following) {
      closest = el
    }
  }
  return closest
}

function getExt(str) {
  const dotIndex = str.lastIndexOf(".")
  return dotIndex > -1 ? str.substring(dotIndex + 1).toLowerCase() : null
}

async function normalize(str) {
  if (/^(ftp|file|http|https|):\/\//i.test(str)) return str
  if (str.startsWith("../")) {
    const { path, url } = await logseq.App.getCurrentGraph()
    return `file://${path}${str.substring(2)}`
  }
  return `file://${encodeURI(str.replaceAll("\\", "/"))}`
}

async function mediaRenderer({ slot, payload: { arguments: args } }) {
  if (args.length === 0) return
  const type = args[0].trim()
  if (type !== ":media") return

  const path = args[1].trim()
  if (!path) return

  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
  const ext = getExt(path)

  logseq.provideUI({
    key: "media",
    slot,
    template: VideoExts.has(ext)
      ? `<video controls crossorigin="anonymous" style="width: 100%" src="${await normalize(
          path,
        )}"></video>`
      : AudioExts.has(ext)
      ? `<audio controls crossorigin="anonymous" src="${await normalize(
          path,
        )}"></audio>`
      : lang === "zh-CN"
      ? "无媒体"
      : "No media",
    reset: true,
  })
}

const model = {
  mediaJump(args) {
    const slotId = args.dataset.slot
    const ts = +args.dataset.ts
    const el = parent.document.getElementById(slotId)
    const media = findMediaElement(el)
    if (media.tagName === "IFRAME") {
      media.src = `${media.src.replace(/&t=[0-9]+(\.[0-9]+)?$/, "")}&t=${ts}`
    } else {
      media.currentTime = ts
    }
  },
}

logseq.ready(model, main).catch(console.error)
