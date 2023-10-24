import "@logseq/libs"
import { setup, t } from "logseq-l10n"
import { generateScreenshotName, timePass, toArrayBuffer } from "./libs/utils"
import zhCN from "./translations/zh-CN.json"

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

let bc
let lastID
let lastData

const storage = logseq.Assets.makeSandboxStorage()

async function main() {
  await setup({ builtinTranslations: { "zh-CN": zhCN } })

  logseq.provideStyle({
    key: "kef-media-ts",
    style: `
    .kef-media-ts-ts {
      display: inline-flex;
      align-items: center;
    }

    .kef-media-ts-pro {
      font-size: 14px;
      margin-left: 5px;
    }
    `,
  })

  logseq.App.onMacroRendererSlotted(tsRenderer)
  logseq.Editor.registerSlashCommand("Media timestamp", () =>
    insertMediaTsRenderer(),
  )
  logseq.Editor.registerSlashCommand("Media timestamp with screenshot", () =>
    insertMediaTsRendererWithScreenshot(),
  )
  logseq.App.registerCommandPalette(
    {
      key: "insert-media-ts",
      label: t("Insert media timestamp"),
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
  logseq.App.registerCommandPalette(
    {
      key: "insert-media-ts-screenshot",
      label: t("Insert media timestamp with screenshot"),
      ...(logseq.settings.mediaTsScreenshotShortcut && {
        keybinding: {
          binding: logseq.settings.mediaTsScreenshotShortcut,
        },
      }),
    },
    (e) => {
      insertMediaTsRenderer(true)
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
    t("Convert to media renderer"),
    async ({ uuid }) => {
      const block = await logseq.Editor.getBlock(uuid)
      await logseq.Editor.updateBlock(
        uuid,
        `{{renderer :media, ${block.content.replace(LinkRegex, "$1")}}}`,
      )
    },
  )

  bc = new BroadcastChannel("kef-media-ts")
  bc.onmessage = (e) => {
    const { type } = e.data
    switch (type) {
      case "find-req": {
        const { id, withScreenshot } = e.data
        onFindReq(id, withScreenshot)
        break
      }
      case "find-res": {
        const { id, data } = e.data
        onFindRes(id, data)
        break
      }
      case "jump-req": {
        const { ts, blockId } = e.data
        onJumpReq(ts, blockId)
        break
      }
      default:
        break
    }
  }

  logseq.useSettingsSchema([
    {
      key: "mediaTsShortcut",
      type: "string",
      default: "",
      description: t(
        'Assign a shortcut for inserting timestamp, e.g. "mod+shift+m".',
      ),
    },
    {
      key: "mediaTsScreenshotShortcut",
      type: "string",
      default: "",
      description: t(
        'Assign a shortcut for inserting timestamp + screentshot, e.g. "mod+shift+n".',
      ),
    },
    {
      key: "captureOffset",
      type: "number",
      default: 0,
      description: t(
        "An offset in seconds, for the capture time. E.g, -2.5 would move the capture time 2.5 seconds before the capture.",
      ),
    },
  ])

  logseq.beforeunload(() => {
    bc.close()
  })

  console.log("#media-ts loaded")
}

async function tsRenderer({ slot, payload: { arguments: args } }) {
  if (args.length === 0) return
  const type = args[0].trim()
  if (type !== ":media-timestamp") return

  const timeArg = args[1]?.trim()
  if (!timeArg) return

  const mediaBlockId = args[2]?.replace(/^\s*\(\((.*)\)\)\s*$/, "$1")

  const time = getTimeFromArg(timeArg)
  const timeStr = formatTime(time)
  const dataBlock = mediaBlockId ? ` data-block="${mediaBlockId}"` : ""
  logseq.provideUI({
    key: `media-ts-${slot}`,
    slot,
    template: `<a class="kef-media-ts-ts svg-small" data-ts="${time}"${dataBlock} data-slot="${slot}" data-on-click="mediaJump">${icon}${timeStr}<a class="kef-media-ts-pro" href="https://github.com/sethyuan/logseq-media-ts" target="_blank">🛒</a></a>`,
    reset: true,
    style: { alignItems: "center" },
  })
}

async function insertMediaTsRenderer(withScreenshot = false) {
  const { time, screenshot } = (await findMediaData(withScreenshot)) ?? {}
  if (time != null) {
    const captureOffset = +logseq.settings?.captureOffset ?? 0
    const currentTime = Math.max(time + captureOffset, 0)
    const ts = `{{renderer :media-timestamp, ${currentTime}}}`
    if (screenshot) {
      await logseq.Editor.insertAtEditingCursor(
        `![timestamp](${screenshot})\n${ts}`,
      )
    } else {
      await logseq.Editor.insertAtEditingCursor(ts)
    }
  } else {
    await logseq.Editor.insertAtEditingCursor(`{{renderer :media-timestamp, }}`)
    const input = parent.document.activeElement
    const pos = input.selectionStart - 2
    input.setSelectionRange(pos, pos)
  }
}

async function insertMediaTsRendererWithScreenshot() {
  return await insertMediaTsRenderer(true)
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

async function findMediaData(withScreenshot) {
  const input = parent.document.activeElement
  const media = await findMediaElement(input)
  if (media?.currentTime) {
    if (withScreenshot && media.tagName.toLowerCase() === "video") {
      return {
        time: media.currentTime,
        screenshot: await getVideoScreenshot(media),
      }
    }
    return { time: media.currentTime }
  } else {
    return await askForMediaData(withScreenshot)
  }
}

async function findMediaElement(refEl, blockId) {
  if (blockId) {
    let block = parent.document.querySelector(
      `.block-content[blockid="${blockId}"]`,
    )
    if (block == null) {
      logseq.Editor.openInRightSidebar(blockId)
      await timePass(1000)
      block = parent.document.querySelector(
        `.block-content[blockid="${blockId}"]`,
      )
    }
    return findMediaElementIn(block, (_el) => true)
  } else {
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
        (el) =>
          refEl == null || el?.compareDocumentPosition(refEl) === Following,
      )
    )
  }
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

  const renderered = parent.document.getElementById(slot).childElementCount > 0
  if (!renderered) {
    const ext = getExt(path)

    logseq.provideUI({
      key: `media-${slot}`,
      slot,
      template: VideoExts.has(ext)
        ? `<video controls crossorigin="anonymous" style="width: 100%" src="${await normalize(
            path,
          )}"></video>`
        : AudioExts.has(ext)
        ? `<audio controls crossorigin="anonymous" src="${await normalize(
            path,
          )}"></audio>`
        : t("No media"),
      reset: true,
    })
  }
}

function askForMediaData(withScreenshot) {
  return new Promise((resolve) => {
    lastID = Date.now()
    bc.postMessage({ type: "find-req", id: lastID, withScreenshot })
    setTimeout(() => {
      const data = lastData
      lastID = undefined
      lastData = undefined
      resolve(data)
    }, 100)
  })
}

async function getVideoScreenshot(media) {
  const canvas = parent.document.createElement("canvas")
  canvas.width = media.videoWidth
  canvas.height = media.videoHeight

  const ctx = canvas.getContext("2d")
  ctx.drawImage(media, 0, 0)

  const arrayBuffer = await toArrayBuffer(canvas)
  const filename = generateScreenshotName(media.currentTime)
  await storage.setItem(filename, arrayBuffer)

  return `../assets/storages/${logseq.baseInfo.id}/${filename}`
}

async function onFindReq(id, withScreenshot) {
  const media = await findMediaElement()
  if (media?.currentTime) {
    if (withScreenshot && media.tagName.toLowerCase() === "video") {
      bc.postMessage({
        type: "find-res",
        id,
        data: {
          time: media.currentTime,
          screenshot: await getVideoScreenshot(media),
        },
      })
    } else {
      bc.postMessage({
        type: "find-res",
        id,
        data: { time: media.currentTime },
      })
    }
  }
}

function onFindRes(id, data) {
  if (id === lastID) {
    lastData = data
  }
}

async function onJumpReq(ts, blockId) {
  const media = await findMediaElement(null, blockId)
  if (!media) return
  if (media.tagName !== "IFRAME") {
    media.currentTime = ts
    media.play()
  }
}

function askForJumping(ts, blockId) {
  bc.postMessage({ type: "jump-req", ts, blockId })
}

const model = {
  async mediaJump(args) {
    const slotId = args.dataset.slot
    const ts = +args.dataset.ts
    const blockId = args.dataset.block
    const el = parent.document.getElementById(slotId)
    const media = await findMediaElement(el, blockId)
    if (media) {
      if (media.tagName === "IFRAME") {
        media.src = `${media.src.replace(/&t=[0-9]+(\.[0-9]+)?$/, "")}&t=${ts}`
      } else {
        if (media.paused && media.currentTime === 0) {
          askForJumping(ts, blockId)
        }
        media.currentTime = ts
        media.play()
      }
    } else {
      askForJumping(ts, blockId)
    }
  },
}

logseq.ready(model, main).catch(console.error)
