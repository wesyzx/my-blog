const OWNED_HOSTS = new Set(['img.guanyan.me', 'img.215320.xyz'])
const MEDIA_EXTENSION = /\.(?:gif|heic|heif|jpe?g|png|svg|webp|m4v|mov|mp4|webm)$/i
const R2_URL = /https:\/\/(?:img\.guanyan\.me|img\.215320\.xyz)\/[^\s<>"')\]]+/g

/**
 * Normalize an owned image/video URL or R2 key to a comparison stem.
 * A `.webp` URL and a stored `.jpg` object resolve to the same stem.
 */
export function r2ObjectStem(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  let pathname
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      if (!OWNED_HOSTS.has(url.hostname)) return null
      pathname = url.pathname
    } catch {
      return null
    }
  } else {
    pathname = value.trim().split(/[?#]/, 1)[0]
    if (!pathname.startsWith('/')) pathname = `/${pathname}`
  }

  let key
  if (pathname.startsWith('/webp/blog/obsidian/')) {
    key = pathname.slice('/webp/blog/obsidian/'.length)
  } else if (pathname.startsWith('/webp/video/blog/obsidian/')) {
    key = pathname.slice('/webp/video/blog/obsidian/'.length)
  } else if (pathname.startsWith('/blog/obsidian/')) {
    key = pathname.slice('/blog/obsidian/'.length)
  } else {
    const match = pathname.match(
      /^\/webp\/v2\/(?:original\/|info\/|[^/]+\/[^/]+\/[^/]+\/)blog\/obsidian\/(.+)$/,
    )
    key = match?.[1]
  }
  if (!key) return null

  try {
    const segments = key.split('/').map((segment) => decodeURIComponent(segment))
    if (segments.some((segment) => !segment || segment === '.' || segment === '..'
      || /[\\/\u0000-\u001f\u007f]/.test(segment)
      || /%(?:2e|2f|5c|25)/i.test(segment))) return null
    const normalized = `blog/obsidian/${segments.join('/')}`
    if (!MEDIA_EXTENSION.test(normalized)) return null
    return normalized.replace(MEDIA_EXTENSION, '')
  } catch {
    return null
  }
}

/** Collect owned R2 media references from note text and its frontmatter. */
export function r2Sources(source, data = {}) {
  const values = []
  for (const match of String(source || '').matchAll(R2_URL)) values.push(match[0])
  if (typeof data.cover === 'string') values.push(data.cover)
  if (Array.isArray(data.images)) {
    for (const image of data.images) {
      const value = typeof image === 'string' ? image : image?.src
      if (typeof value === 'string') values.push(value)
    }
  }
  return [...new Set(values.filter((value) => r2ObjectStem(value)))]
}
