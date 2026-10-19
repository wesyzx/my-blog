/** 从图片文件头解析尺寸，支持 JPEG / PNG / WebP / GIF */
export function readImageSize(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  // PNG：8 字节签名后紧跟 IHDR
  if (buffer.length > 24 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { width: view.getUint32(16), height: view.getUint32(20) }
  }

  // GIF
  if (buffer.length > 10 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) }
  }

  // WebP（RIFF 容器，三种子格式）
  if (buffer.length > 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const format = buffer.toString('ascii', 12, 16)
    if (format === 'VP8X') return { width: (view.getUint32(24, true) & 0xffffff) + 1, height: (view.getUint32(27, true) & 0xffffff) + 1 }
    if (format === 'VP8 ') return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
    if (format === 'VP8L') {
      const bits = view.getUint32(21, true)
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }
  }

  // JPEG：逐段扫描，找到 SOFn 帧头
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue }
      const marker = buffer[offset + 1]
      if (marker === 0xff) { offset += 1; continue }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue }
      const segmentLength = view.getUint16(offset + 2)
      const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      if (isFrameHeader) return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) }
      offset += 2 + segmentLength
    }
  }

  return null
}
