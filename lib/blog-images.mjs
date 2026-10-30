/** @typedef {'fit' | 'full' | 'square' | 'landscape' | 'wide' | 'cover' | 'banner' | 'content'} BlogImagePreset */
/** @typedef {'auto' | 'center' | 'top' | 'face'} BlogImageFocus */
/** @typedef {{ preset?: BlogImagePreset, width?: number, focus?: BlogImageFocus }} BlogImageOptions */

const ORIGIN = 'https://img.guanyan.me'
const PRESETS = new Set(['fit', 'full', 'square', 'landscape', 'wide', 'cover', 'banner', 'content'])
const FOCUSES = new Set(['auto', 'center', 'top', 'face'])
export const BLOG_IMAGE_WIDTHS = Object.freeze([32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 2400])

/**
 * Recognize only the two owned hosts and the agreed image routes. Validate the
 * raw path before URL can resolve dot segments or silently repair backslashes.
 * Unknown queries (including signatures) must keep their original URL intact.
 * @param {unknown} src
 */
function parseBlogImage(src) {
  if (typeof src !== 'string') return null
  const match = /^https:\/\/(?:img\.guanyan\.me|img\.215320\.xyz)(\/[^?#]*)(?:\?([^#]*))?$/.exec(src)
  if (!match) return null
  const [, path, query = ''] = match
  let key
  /** @type {BlogImageFocus} */
  let routeFocus = 'auto'
  if (path.startsWith('/webp/blog/obsidian/')) {
    key = path.slice('/webp/blog/obsidian/'.length)
  } else if (path.startsWith('/blog/obsidian/')) {
    // Older Obsidian notes linked originals directly, sometimes using .webp
    // for a stored JPEG. The Worker resolves both through the same source key.
    key = path.slice('/blog/obsidian/'.length)
    if (!/\.(?:jpe?g|png|gif|webp)$/i.test(key)) return null
    key = key.replace(/\.[^.]+$/, '.webp')
  } else {
    const route = /^\/webp\/v2\/([^/]+)\/(\d+)\/([^/]+)\/blog\/obsidian\/(.+)$/.exec(path)
    if (!route) return null
    const [, preset, width, focus, routeKey] = route
    const steps = preset === 'full' ? [...BLOG_IMAGE_WIDTHS, 3840] : BLOG_IMAGE_WIDTHS
    if (!PRESETS.has(preset) || !FOCUSES.has(focus) || !steps.some((step) => String(step) === width)) return null
    key = routeKey
    routeFocus = /** @type {BlogImageFocus} */ (focus)
  }

  // Canonicalize each segment once; reject encoded separators and double encoding.
  try {
    const segments = key.split('/').map((segment) => decodeURIComponent(segment))
    if (segments.some((segment) => !segment || segment === '.' || segment === '..'
      || /[\\/\u0000-\u001f\u007f]/.test(segment)
      || /%(?:2e|2f|5c|25)/i.test(segment))) return null
    if (!segments.at(-1)?.endsWith('.webp') || segments.at(-1) === '.webp') return null
    key = segments.map((segment) => encodeURIComponent(segment)).join('/')
  } catch {
    return null
  }

  let cropOff = false
  /** @type {BlogImageFocus | undefined} */
  let queryFocus
  const seen = new Set()
  for (const [name, value] of new URLSearchParams(query)) {
    if (seen.has(name)) return null
    seen.add(name)
    if (name === 'crop' && value === 'off') cropOff = true
    else if (name === 'focus' && FOCUSES.has(value)) queryFocus = /** @type {BlogImageFocus} */ (value)
    else if (!/^imageMogr2\/thumbnail\/\d+x(?:\/quality\/\d{1,3})?(?:\/format\/webp)?$/.test(name) || value !== '') return null
  }
  return { key, cropOff, focus: queryFocus ?? routeFocus }
}

/** @param {unknown} src @returns {boolean} */
export function isBlogImage(src) {
  return parseBlogImage(src) !== null
}

/** Keep diagrams and screenshots whole in both the Worker and card CSS.
 * @param {unknown} src @returns {boolean}
 */
export function blogImageCropDisabled(src) {
  return parseBlogImage(src)?.cropOff === true
}

/**
 * Generate a bounded Worker variant; unrelated or signed inputs pass through.
 * Widths round up to the next supported step, capped at 2400 (full: 3840).
 * Quality is part of the Worker preset contract: fit/crops 75, full 82.
 * @param {string} src
 * @param {BlogImageOptions} [options]
 * @returns {string}
 */
export function blogImageUrl(src, { preset = 'fit', width, focus = 'auto' } = {}) {
  const image = parseBlogImage(src)
  if (!image) return src
  if (!PRESETS.has(preset) || !FOCUSES.has(focus)) throw new RangeError('Unknown blog image preset or focus')
  if (width !== undefined && (!Number.isFinite(width) || width <= 0)) throw new RangeError('Blog image width must be positive and finite')
  if (image.cropOff && preset !== 'full') preset = 'fit'
  if (preset === 'fit' || preset === 'full') focus = 'center'
  else if (focus === 'auto') focus = image.focus
  const steps = preset === 'full' ? [...BLOG_IMAGE_WIDTHS, 3840] : BLOG_IMAGE_WIDTHS
  const maximum = steps[steps.length - 1]
  const size = steps.find((step) => step >= (width ?? maximum)) ?? maximum
  return `${ORIGIN}/webp/v2/${preset}/${size}/${focus}/blog/obsidian/${image.key}`
}

/** @param {string} src @returns {string} */
export function blogImageInfoUrl(src) {
  const image = parseBlogImage(src)
  return image ? `${ORIGIN}/webp/v2/info/blog/obsidian/${image.key}` : src
}
