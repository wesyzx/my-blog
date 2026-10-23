const IMAGE_EXTENSION = /\.(?:gif|jpe?g|png|svg|webp)$/i
const STATIC_ASSET_PATH = /^\/(?:favicon\.ico|robots\.txt)$/i
const PUBLIC_PREFIX = '/webp/'
const SOURCE_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg']

// The site's older image loader appends `?imageMogr2/thumbnail/{w}x/quality/{q}`.
// Parsing it keeps existing links working; new links use the versioned route.
const THUMBNAIL = /(?:^|\/)thumbnail\/(\d+)x(?!\d)/i
const QUALITY = /(?:^|\/)quality\/(\d{1,3})(?!\d)/i
const MAX_WIDTH = 2400
const FULL_WIDTH = 3840
const DEFAULT_QUALITY = 82

// Next.js emits imageSizes {32..384} and deviceSizes {640..3840}. Snapping a
// requested width onto this ladder bounds one image to a dozen transformations
// instead of the 2,400 an arbitrary `thumbnail/NNNx` would allow.
const WIDTH_LADDER = [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, MAX_WIDTH]
const QUALITY_LADDER = [60, 70, 75, 80, 82, 90]

// `/webp/v2/{preset}/{width}/{focus}/blog/obsidian/{key}`
const V2_ROUTE = /^\/webp\/v2\/([^/]+)\/(\d+)\/([^/]+)\/blog\/obsidian\/(.+)$/
const V2_ORIGINAL_ROUTE = /^\/webp\/v2\/original\/blog\/obsidian\/(.+)$/
const INFO_ROUTE = /^\/webp\/v2\/info\/blog\/obsidian\/(.+)$/
const PRESETS = {
  fit: { ratio: null },
  full: { ratio: null },
  square: { ratio: 1 },
  landscape: { ratio: 4 / 3 },
  wide: { ratio: 16 / 9 },
  cover: { ratio: 3 },
  banner: { ratio: 2 },
  content: { ratio: 16 / 10 },
}
// `auto` picks a saliency focal point, `face` frames detected faces, `top`
// keeps headroom that center-cropping a portrait would cut off.
const FOCUS = new Set(['auto', 'center', 'top', 'face'])
const SVG_TYPE = 'image/svg+xml'

function errorResponse(status, message, headers = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  })
}

/**
 * Preserve the deployed negotiation contract, respecting explicit q=0 over a
 * wildcard. The Images binding itself accepts raw bytes and a fixed format;
 * this negotiation is our compatibility policy, not an encoder requirement.
 */
function acceptsWebp(request) {
  const ranges = (request.headers.get('accept') || '').toLowerCase().split(',')
    .map((range) => {
      const [type, ...parameters] = range.trim().split(';')
      const quality = parameters.map((part) => part.trim()).find((part) => part.startsWith('q='))
      const q = quality === undefined ? 1 : Number(quality.slice(2))
      return { type: type.trim(), q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0 }
    })
  const exact = ranges.filter((range) => range.type === 'image/webp')
  const matches = exact.length ? exact : ranges.filter((range) => range.type === 'image/*')
  return matches.some((range) => range.q > 0)
}

function snapWidth(requested, maximum = MAX_WIDTH) {
  if (!Number.isFinite(requested) || requested <= 0) return maximum
  const steps = maximum > MAX_WIDTH ? [...WIDTH_LADDER, FULL_WIDTH] : WIDTH_LADDER
  return steps.find((step) => step >= requested) ?? maximum
}

function snapQuality(requested) {
  if (!Number.isFinite(requested) || requested < 20 || requested > 100) return DEFAULT_QUALITY
  return QUALITY_LADDER.reduce((best, step) =>
    Math.abs(step - requested) < Math.abs(best - requested) ? step : best)
}

/**
 * Reads the width and quality the legacy loader asked for and snaps both onto
 * fixed ladders. Clamping alone still left 2,400 possible widths per image, so
 * a crawler walking `thumbnail/1x` … `thumbnail/2400x` could exhaust the monthly
 * transformation quota. The ladder keeps every image to a fixed, small set.
 */
function legacyOptions(url) {
  const requestedWidth = Number(url.search.match(THUMBNAIL)?.[1])
  const requestedQuality = Number(url.search.match(QUALITY)?.[1])
  return {
    preset: 'fit',
    width: snapWidth(Number.isFinite(requestedWidth) && requestedWidth > 0 ? requestedWidth : MAX_WIDTH),
    quality: snapQuality(requestedQuality),
    focus: 'center',
  }
}

/**
 * Parses the versioned variant route. Widths must be on the ladder: the URL is
 * the cache key, so it has to describe exactly one output, and accepting
 * arbitrary widths would let a crawler mint a transformation per integer.
 */
function variantOptions(path) {
  const match = V2_ROUTE.exec(path)
  if (!match) return null
  const [, preset, rawWidth, focus, key] = match
  if (!Object.hasOwn(PRESETS, preset) || !FOCUS.has(focus)) return null
  const width = Number(rawWidth)
  const allowed = preset === 'full' ? [...WIDTH_LADDER, FULL_WIDTH] : WIDTH_LADDER
  if (!allowed.includes(width)) return null
  return {
    preset,
    key,
    width,
    // Aspect-preserving presets ignore the focal point; a crop needs one.
    focus: PRESETS[preset].ratio === null ? 'center' : focus,
    quality: preset === 'full' ? DEFAULT_QUALITY : 75,
  }
}

/**
 * The public link uses .webp while R2 retains the uploaded original format.
 * Only the dedicated Blog prefix is readable; original objects stay untouched.
 */
function safeKey(key) {
  if (!key || key.includes('\0')) return null
  let decoded
  try {
    const segments = key.split('/').map((segment) => decodeURIComponent(segment))
    if (segments.some((segment) => !segment || segment === '.' || segment === '..'
      || /[\\/\u0000-\u001f\u007f]/.test(segment)
      || /%(?:2e|2f|5c|25)/i.test(segment))) return null
    decoded = segments.join('/')
  } catch {
    return null
  }
  if (!decoded.startsWith('blog/obsidian/') || !IMAGE_EXTENSION.test(decoded)) return null
  if (decoded.split('/').some((part) => part === '..' || part === '.')) return null
  return decoded
}

function sourceKeys(key) {
  const stem = key.replace(/\.[^.]+$/, '')
  return [...new Set([key, ...SOURCE_EXTENSIONS.map((extension) => `${stem}${extension}`)])]
}

/** Re-encode a validated key so the redirect cannot smuggle a separator. */
function originalPath(key) {
  return `/webp/v2/original/${key.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`
}

function originalRedirect(key, reason) {
  return new Response(null, {
    status: 302,
    headers: {
      // Relative redirects keep the browser on EdgeOne when it changes Host
      // to img.215320.xyz during origin pull.
      location: originalPath(key),
      'cache-control': 'no-store',
      vary: 'accept',
      'x-image-fallback': reason,
    },
  })
}

async function convert(request, env, object, key, transform, quality, headers) {
  try {
    const converted = await env.IMAGES.input(object.body)
      .transform(transform)
      .output({ format: 'image/webp', quality })
    if (!converted?.response) throw new Error('Image conversion returned no response')
    const response = converted.response({ headers })
    if (!response.ok) throw new Error('Image conversion returned an error response')
    return request.method === 'HEAD'
      ? new Response(null, { status: response.status, headers: response.headers })
      : response
  } catch (error) {
    console.error(JSON.stringify({
      message: 'Image conversion failed; serving original',
      error: error instanceof Error ? error.name : 'UnknownError',
    }))
    // Quota exhaustion, unsupported sources and transient encoder failures must
    // not break published notes or cache original bytes as a WebP thumbnail.
    return originalRedirect(key, 'conversion-failed')
  }
}

/** The stored object type, falling back to the requested extension. */
function sourceContentType(object, key) {
  const stored = object.httpMetadata?.contentType
  if (stored) return stored
  const extension = key.slice(key.lastIndexOf('.')).toLowerCase()
  return {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.svg': SVG_TYPE, '.webp': 'image/webp',
  }[extension] || 'application/octet-stream'
}

async function readObject(env, key) {
  for (const candidate of sourceKeys(key)) {
    const object = await env.IMAGES_BUCKET.get(candidate)
    if (object?.body) return { object, sourceKey: candidate }
  }
  return null
}

/** Cloudflare Images cannot decode SVG, so vectors are passed through as-is. */
function isSvg(object, sourceKey) {
  return sourceContentType(object, sourceKey) === SVG_TYPE
}

function originalResponse(request, object, sourceKey, cacheControl = 'public, max-age=31536000, immutable') {
  const headers = new Headers({
    'x-content-type-options': 'nosniff',
    'content-type': sourceContentType(object, sourceKey),
    'cache-control': cacheControl,
    etag: object.httpEtag,
  })
  if (cacheControl === 'no-store') headers.set('vary', 'accept')
  if (request.method === 'HEAD') return new Response(null, { status: 200, headers })
  return new Response(object.body, { status: 200, headers })
}

function variantTransform(options) {
  const { preset, width, focus } = options
  if (PRESETS[preset].ratio === null) {
    // Cap the long edge rather than the width: a portrait photo at 3840 px wide
    // would otherwise decode to roughly 5760 px tall in the lightbox.
    return preset === 'full'
      ? { fit: 'scale-down', width, height: width }
      : { fit: 'scale-down', width }
  }
  return {
    // `crop` fills and crops like `cover` but never upscales, so a small source
    // is not blown up into blur. The card CSS already covers whatever comes back.
    fit: 'crop',
    width,
    height: Math.round(width / PRESETS[preset].ratio),
    ...(focus === 'center' ? {} : { gravity: focus }),
  }
}

async function serveVariant(request, env, options) {
  const found = await readObject(env, options.key)
  if (!found) return errorResponse(404, 'Image not found')
  if (isSvg(found.object, found.sourceKey)) {
    return originalResponse(request, found.object, found.sourceKey)
  }

  // An explicit WebP path always produces WebP, independent of Accept. The
  // Images binding encodes raw bytes with an explicit format; negotiation here
  // would depend on EdgeOne honoring Vary, which live checks showed it does not.
  // Original bytes remain on their own path; encoder failures redirect there.

  const etag = `"${found.object.httpEtag.replace(/^W\/|"/g, '')}-v2-${options.preset}-${options.width}-${options.focus}-q${options.quality}"`
  const headers = new Headers({
    'x-content-type-options': 'nosniff',
    'cache-control': 'public, max-age=31536000, immutable',
    etag,
  })
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers })
  }

  return convert(request, env, found.object, options.key, variantTransform(options), options.quality, headers)
}

async function serveInfo(request, env, key) {
  const found = await readObject(env, key)
  if (!found) return errorResponse(404, 'Image not found')
  if (isSvg(found.object, found.sourceKey)) {
    return errorResponse(415, 'Metadata is unavailable for vector images')
  }
  const info = await env.IMAGES.info(found.object.body)
  if (!info?.width || !info?.height) return errorResponse(502, 'Image metadata unavailable')
  const body = JSON.stringify({
    width: info.width,
    height: info.height,
    format: info.format || null,
    fileSize: info.fileSize || null,
  })
  return new Response(request.method === 'HEAD' ? null : body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}

async function serveLegacy(request, env, url) {
  const match = /^\/webp\/(.+)$/.exec(url.pathname)
  const key = match ? safeKey(match[1]) : null
  if (!key) return errorResponse(404, 'Image not found')

  const found = await readObject(env, key)
  if (!found) return errorResponse(404, 'Image not found')
  if (isSvg(found.object, found.sourceKey)) {
    return originalResponse(request, found.object, found.sourceKey)
  }

  if (!acceptsWebp(request)) {
    // Legacy links have no separate variant URL, so the fallback must stay out
    // of every cache. New links never take this branch.
    return originalResponse(request, found.object, found.sourceKey, 'no-store')
  }

  const { width, quality } = legacyOptions(url)
  const etag = `"${found.object.httpEtag.replace(/^W\/|"/g, '')}-webp-${width}-q${quality}"`
  const headers = new Headers({
    'x-content-type-options': 'nosniff',
    'cache-control': 'public, max-age=31536000, immutable',
    etag,
    vary: 'accept',
  })
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers })
  }

  return convert(request, env, found.object, key, { fit: 'scale-down', width }, quality, headers)
}

async function serveImage(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return errorResponse(405, 'Method not allowed', { allow: 'GET, HEAD' })
  }

  const info = INFO_ROUTE.exec(url.pathname)
  if (info) {
    const key = safeKey(`blog/obsidian/${info[1]}`)
    return key ? serveInfo(request, env, key) : errorResponse(404, 'Image not found')
  }

  const original = V2_ORIGINAL_ROUTE.exec(url.pathname)
  if (original) {
    const key = safeKey(`blog/obsidian/${original[1]}`)
    if (!key) return errorResponse(404, 'Image not found')
    const found = await readObject(env, key)
    if (!found) return errorResponse(404, 'Image not found')
    return originalResponse(request, found.object, found.sourceKey)
  }

  const options = variantOptions(url.pathname)
  if (options) {
    const key = safeKey(`blog/obsidian/${options.key}`)
    if (!key) return errorResponse(404, 'Image not found')
    return serveVariant(request, env, { ...options, key })
  }

  if (!url.pathname.startsWith(PUBLIC_PREFIX)) return errorResponse(404, 'Image not found')
  return serveLegacy(request, env, url)
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, formats: ['webp'] }), {
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      })
    }
    if (STATIC_ASSET_PATH.test(url.pathname)) {
      return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } })
    }

    try {
      return await serveImage(request, env, url)
    } catch (error) {
      console.error(JSON.stringify({
        message: 'Image conversion failed',
        path: url.pathname,
        error: error instanceof Error ? error.name : 'UnknownError',
      }))
      return errorResponse(502, 'Image conversion failed')
    }
  },
}

export default worker
