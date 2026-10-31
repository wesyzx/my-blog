import path from 'node:path'

export const WIKI_EMBED_PATTERN = /!\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g
export const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\((<[^>]+>|[^)"\n]+?)(?:\s+"[^"]*")?\)/g
export const HTML_VIDEO_PATTERN = /<video\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<\/video>/gi

// Encoded links still refer to the original file, but literal percent signs are valid filenames too.
export function decodeAttachmentTarget(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function localAttachmentTargets(source, data) {
  const targets = []
  for (const match of source.matchAll(WIKI_EMBED_PATTERN)) targets.push(match[1])
  for (const match of source.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    targets.push(decodeAttachmentTarget(match[2].replace(/^<|>$/g, '')))
  }
  for (const match of source.matchAll(HTML_VIDEO_PATTERN)) targets.push(decodeAttachmentTarget(match[1]))
  if (data.cover) targets.push(decodeAttachmentTarget(String(data.cover)))
  if (data.images !== undefined) {
    if (!Array.isArray(data.images)) throw new Error('Invalid image list')
    for (const image of data.images) {
      const src = typeof image === 'string' ? image : image?.src
      if (typeof src !== 'string' || !src.trim()) throw new Error('Invalid image source')
      targets.push(decodeAttachmentTarget(src))
    }
  }
  return [...new Set(targets.map((value) => value.trim()).filter((value) => {
    return value && !/^(?:https?:|data:|\/)/i.test(value)
  }))]
}

// Both the server exporter and filesystem publisher use paths relative to Blog.
export function attachmentCandidates(target, sourcePath, roots = ['attachments']) {
  if (target.includes('\\') || target.includes('\0')) return []
  const relative = target.replace(/^Blog\//, '')
  return [...new Set([
    path.posix.join(path.posix.dirname(sourcePath), relative),
    relative,
    ...roots.map((root) => path.posix.join(root, relative)),
  ])].filter((candidate) => (
    !path.posix.isAbsolute(candidate)
    && roots.some((root) => candidate.startsWith(`${root}/`))
    && path.posix.normalize(candidate) === candidate
    && !candidate.split('/').includes('..')
  ))
}
