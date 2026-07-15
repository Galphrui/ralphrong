export function formatAttachmentBytes(size) {
  const value = Number(size || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export function attachmentName(item = {}) {
  return item.fileName || item.name || 'attachment'
}

export function attachmentDirectUrl(item = {}) {
  return item.rawUrl || item.url || item.dataUrl || ''
}

export function isChunkedAttachment(item = {}) {
  return Boolean(item.chunked && Array.isArray(item.chunks) && item.chunks.length)
}

export async function attachmentBlob(item = {}, onProgress) {
  if (!isChunkedAttachment(item)) {
    const directUrl = attachmentDirectUrl(item)
    if (!directUrl) throw new Error('附件缺少下载地址。')
    const response = await fetch(directUrl)
    if (!response.ok) throw new Error(`附件下载失败：HTTP ${response.status}`)
    return response.blob()
  }

  const chunks = [...item.chunks].sort((a, b) => Number(a.index || 0) - Number(b.index || 0))
  const parts = []
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]
    const url = chunk.rawUrl || chunk.url
    if (!url) throw new Error(`第 ${index + 1} 个分包缺少下载地址。`)
    onProgress?.({ index, total: chunks.length })
    const response = await fetch(url)
    if (!response.ok) throw new Error(`第 ${index + 1}/${chunks.length} 个分包下载失败：HTTP ${response.status}`)
    parts.push(await response.arrayBuffer())
  }
  onProgress?.({ index: chunks.length, total: chunks.length })
  return new Blob(parts, { type: item.mimeType || 'application/octet-stream' })
}

export async function attachmentObjectUrl(item = {}, onProgress) {
  if (!isChunkedAttachment(item)) return attachmentDirectUrl(item)
  const blob = await attachmentBlob(item, onProgress)
  return URL.createObjectURL(blob)
}

export async function downloadAttachment(item = {}, onProgress) {
  const blob = await attachmentBlob(item, onProgress)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = attachmentName(item)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
