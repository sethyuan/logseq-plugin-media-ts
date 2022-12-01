export function timePass(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function toArrayBuffer(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob == null) return reject()
      blob.arrayBuffer().then(resolve).catch(reject)
    })
  })
}

export function generateScreenshotName(ts) {
  return `${ts}@${Date.now()}.png`
}
