import { albumRevision } from '../../../lib/publication-revision.mjs'

const IMAGE_EXTENSION = /\.(?:gif|heic|heif|jpe?g|png|svg|webp)$/i
const STATIC_ASSET_PATH = /^\/(?:favicon\.ico|robots\.txt)$/i
const PUBLIC_PREFIX = '/webp/'
const SOURCE_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif', '.svg']

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
const GALLERY_ALBUM_ROUTE = /^\/internal\/gallery\/albums\/([a-f0-9-]{36})\/(photos|publish)$/
const GALLERY_MANIFEST_PATH = '/webp/gallery-manifest'
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
// Cloudflare Images supports HEIC/HEIF on Enterprise plans. The iPhone
// Shortcut converts to JPEG for standard plans, while accepting HEIC here also
// lets Enterprise users upload it without rebuilding the Shortcut.
const GALLERY_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
])
// This is the Images binding's documented maximum input size.
const GALLERY_IMAGE_LIMIT = 20 * 1024 * 1024
const GALLERY_ALBUM_PREFIX = 'internal/gallery/albums/'
const GALLERY_PUBLIC_ORIGIN = 'https://img.guanyan.me/webp'

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

function jsonResponse(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  })
}

function cleanText(value, maximum) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maximum)
}

function cleanDate(value) {
  if (value === undefined || value === null) return new Date().toISOString().slice(0, 10)
  if (typeof value !== 'string') return null
  const date = value.trim()
  if (!date) return new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const parsed = new Date(`${date}T00:00:00.000Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date
    ? date
    : null
}

function uniqueAlbumSlug(title, requested, used) {
  const preferred = requested || title.normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/g, '') || 'album'
  let slug = preferred
  for (let suffix = 2; used.has(slug); suffix += 1) slug = `${preferred}-${suffix}`
  return slug
}

function metadataBucket(env) { return env.METADATA_BUCKET || env.IMAGES_BUCKET }

function sameSecret(actual, expected) {
  if (!actual || !expected || actual.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index)
  }
  return difference === 0
}

function galleryAuthorized(request, env) {
  const authorization = request.headers.get('authorization') || ''
  return authorization.startsWith('Bearer ')
    && sameSecret(authorization.slice('Bearer '.length), env.GALLERY_UPLOAD_TOKEN || '')
}

function albumKey(id) {
  return `${GALLERY_ALBUM_PREFIX}${id}.json`
}

async function readAlbum(env, id) {
  const object = await metadataBucket(env).get(albumKey(id))
  if (!object?.body) return null
  try {
    return JSON.parse(await new Response(object.body).text())
  } catch {
    return null
  }
}

async function writeAlbum(env, album) {
  album.updatedAt = new Date().toISOString()
  await metadataBucket(env).put(albumKey(album.id), JSON.stringify(album), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  })
}

async function listGalleryAlbums(env) {
  const entries = []
  let cursor
  do {
    const page = await metadataBucket(env).list({
      prefix: GALLERY_ALBUM_PREFIX,
      ...(cursor ? { cursor } : {}),
    })
    entries.push(...(page.objects || []))
    cursor = page.truncated ? page.cursor : undefined
  } while (cursor)
  return entries
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function createGalleryAlbum(request, env) {
  if (request.method !== 'POST') return errorResponse(405, 'Method not allowed', { allow: 'POST' })
  let metadata
  try {
    metadata = await request.json()
  } catch {
    return errorResponse(400, 'Invalid album metadata')
  }

  const title = cleanText(metadata?.title, 120)
  if (!title) return errorResponse(400, 'Album title is required')
  const requestedSlug = cleanText(metadata?.slug, 80).toLowerCase()
  if (requestedSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedSlug)) {
    return errorResponse(400, 'Use lowercase English words or numbers separated by hyphens for the album link')
  }
  if (requestedSlug.length > 64) return errorResponse(400, 'Album link is too long')
  const date = cleanDate(metadata?.date)
  if (!date) return errorResponse(400, 'Photo date must be a valid YYYY-MM-DD date')
  const id = crypto.randomUUID()
  const used = new Set()
  for (const entry of await listGalleryAlbums(env)) {
    const existing = await readAlbum(env, entry.key.slice(GALLERY_ALBUM_PREFIX.length, -'.json'.length))
    if (existing?.slug) used.add(existing.slug)
    for (const alias of existing?.aliases || []) used.add(alias)
  }
  const album = {
    id,
    slug: uniqueAlbumSlug(title, requestedSlug, used),
    title,
    date,
    category: cleanText(metadata?.category, 40) || '日常',
    excerpt: cleanText(metadata?.excerpt, 500),
    createdAt: new Date().toISOString(),
    published: false,
    images: [],
  }
  await writeAlbum(env, album)
  return jsonResponse({ ok: true, albumId: id, slug: album.slug })
}

async function uploadGalleryPhoto(request, env, id) {
  if (request.method !== 'POST') return errorResponse(405, 'Method not allowed', { allow: 'POST' })
  const album = await readAlbum(env, id)
  if (!album) return errorResponse(404, 'Album not found')
  if (album.published === true) return errorResponse(409, 'Published albums are immutable')
  if (album.images.length >= 100) return errorResponse(413, 'Album photo limit reached')

  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (!GALLERY_IMAGE_TYPES.has(contentType)) return errorResponse(415, 'Unsupported photo format')
  const declaredLength = Number(request.headers.get('content-length'))
  if (declaredLength > GALLERY_IMAGE_LIMIT) return errorResponse(413, 'Photo is too large')

  const buffer = await request.arrayBuffer()
  if (!buffer.byteLength) return errorResponse(400, 'Photo body is empty')
  if (buffer.byteLength > GALLERY_IMAGE_LIMIT) return errorResponse(413, 'Photo is too large')

  const hash = await sha256Hex(buffer)
  const duplicate = album.images.find((image) => image.hash === hash)
  if (duplicate) {
    const publicImage = {
      src: duplicate.src,
      width: duplicate.width,
      height: duplicate.height,
      order: duplicate.order,
    }
    return jsonResponse({ ok: true, duplicate: true, image: publicImage })
  }

  let info
  try {
    info = await env.IMAGES.info(buffer)
  } catch {
    return errorResponse(415, 'Photo could not be decoded')
  }
  if (!info?.width || !info?.height) return errorResponse(415, 'Photo dimensions are unavailable')

  const extension = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  }[contentType]
  const [year, month] = album.date.split('-')
  const order = String(album.images.length + 1).padStart(3, '0')
  const objectKey = `blog/obsidian/${year}/${month}/${album.date}-${album.id}-${order}.${extension}`
  await env.IMAGES_BUCKET.put(objectKey, buffer, {
    httpMetadata: { contentType },
  })

  const publicStem = objectKey.replace(/\.[^.]+$/, '')
  const image = {
    src: `${GALLERY_PUBLIC_ORIGIN}/${publicStem}.webp`,
    width: info.width,
    height: info.height,
    order: album.images.length,
    hash,
  }
  album.images.push(image)
  await writeAlbum(env, album)
  const publicImage = {
    src: image.src,
    width: image.width,
    height: image.height,
    order: image.order,
  }
  return jsonResponse({ ok: true, duplicate: false, image: publicImage })
}

async function publishGalleryAlbum(request, env, id) {
  if (request.method !== 'POST') return errorResponse(405, 'Method not allowed', { allow: 'POST' })
  const album = await readAlbum(env, id)
  if (!album) return errorResponse(404, 'Album not found')
  if (!album.images.length) return errorResponse(409, 'Album has no photos')
  if (!env.EDGEONE_DEPLOY_WEBHOOK) {
    return errorResponse(503, 'Gallery publish is not configured')
  }

  // A deployment reads the public manifest, so the album must be visible
  // before the webhook fires. A failure rolls the flag back to its prior value.
  const wasPublished = album.published === true
  album.published = true
  await writeAlbum(env, album)

  let response
  try {
    response = await fetch(env.EDGEONE_DEPLOY_WEBHOOK, { method: 'POST' })
  } catch {
    album.published = wasPublished
    await writeAlbum(env, album)
    return errorResponse(502, 'Deploy webhook request failed')
  }
  if (!response.ok) {
    album.published = wasPublished
    await writeAlbum(env, album)
    return errorResponse(502, `Deploy webhook failed with HTTP ${response.status}`)
  }
  album.deployment = { requestedAt: new Date().toISOString(), revision: await albumRevision(album) }
  await writeAlbum(env, album)
  const statusUrl = `${new URL(request.url).origin}/webp/gallery-status/${id}`

  return jsonResponse({
    ok: true,
    albumId: id,
    slug: album.slug,
    photos: album.images.length,
    deployTriggered: true,
    deployStatus: response.status,
    stage: 'build_requested',
    message: '相册已提交，网站构建已触发；打开状态页确认上线。',
    statusUrl,
    albumUrl: `https://guanyan.me/gallery/${encodeURIComponent(album.slug)}`,
    // Existing installed shortcuts open this field; route them through verification.
    url: statusUrl,
  })
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

async function galleryPublicationStatus(request, env, id) {
  if (request.method !== 'GET') return errorResponse(405, 'Method not allowed', { allow: 'GET' })
  const album = await readAlbum(env, id)
  if (!album?.published || !album.images?.length) return errorResponse(404, 'Album not found')
  const url = new URL(request.url)
  const albumUrl = `https://guanyan.me/gallery/${encodeURIComponent(album.slug)}`
  if (url.searchParams.get('format') !== 'json') {
    const body = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>相册发布状态</title><style>body{font:16px/1.8 system-ui,sans-serif;background:#f8f7f4;color:#252525;margin:0;padding:64px 24px}main{max-width:520px;margin:auto}h1{font-size:28px}li{margin:12px 0}a{display:inline-block;margin-top:24px;color:inherit}[hidden]{display:none}small{color:#666}</style>
<main><small>相册发布</small><h1>${escapeHtml(album.title)}</h1><ol><li>相册已提交</li><li>${album.deployment?.requestedAt ? '网站构建已触发' : '正在核对网站发布状态'}</li><li id="status" role="status" aria-live="polite">正在检查页面是否更新…</li></ol>
<p id="detail">此页面会自动检查。关闭页面不会中断构建。</p><a id="view" href="${escapeHtml(albumUrl)}" hidden>查看相册 →</a><p><small>构建通常需要等待。只有确认页面版本一致，才会显示“已上线”。</small></p></main>
<script>let attempts=0;async function check(){try{const response=await fetch(location.pathname+'?format=json',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();if(data.stage==='site_updated'){document.getElementById('status').textContent='页面已更新，相册已上线';document.getElementById('detail').textContent='已核对相册页面与本次照片版本一致。';document.getElementById('view').hidden=false;return}document.getElementById('status').textContent='等待网站构建和页面更新';document.getElementById('detail').textContent='相册已保存；尚未核实新版本上线。'}catch{document.getElementById('status').textContent='暂时无法核对上线状态，正在重试';}if(++attempts<120)setTimeout(check,10000);else document.getElementById('detail').textContent='仍未确认上线，请稍后刷新此页面。';}check();</script></html>`
    return new Response(body, { headers: {
      'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store',
      'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    } })
  }
  const revision = await albumRevision(album)
  let verified = false
  try {
    const marker = await fetch(`https://guanyan.me/publish-status.json?_=${Date.now()}`, {
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    })
    const status = marker.ok ? await marker.json() : null
    if (status?.version === 1 && status.gallery_fresh === true
      && status.albums?.some((entry) => entry.id === id && entry.slug === album.slug && entry.revision === revision)) {
      const page = await fetch(`${albumUrl}?_publication=${revision}`, {
        cache: 'no-store', signal: AbortSignal.timeout(8000),
      })
      verified = page.ok && (await page.text()).includes(`data-gallery-revision="${revision}"`)
    }
  } catch { /* Pending is honest when a build, cache, or network cannot be verified. */ }
  return jsonResponse({
    stage: verified ? 'site_updated' : 'build_requested',
    submitted: true, buildTriggered: Boolean(album.deployment?.requestedAt),
    siteUpdated: verified, albumUrl,
    checkedAt: new Date().toISOString(),
  })
}

async function serveGalleryManifest(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return errorResponse(405, 'Method not allowed', { allow: 'GET, HEAD' })
  }
  const albums = []
  for (const entry of await listGalleryAlbums(env)) {
    const object = await metadataBucket(env).get(entry.key)
    if (!object?.body) continue
    try {
      const album = JSON.parse(await new Response(object.body).text())
      if (!album?.id || !album.slug || !album.title || !Array.isArray(album.images)) continue
      if (album.published !== true) continue
      if (!album.images.length) continue
      albums.push({
        id: album.id,
        slug: album.slug,
        aliases: album.aliases || [],
        title: album.title,
        date: album.date,
        category: album.category || '日常',
        excerpt: album.excerpt || '',
        cover: album.images[0].src,
        images: album.images.slice()
          .sort((left, right) => left.order - right.order)
          .map(({ src, width, height }) => ({ src, width, height })),
      })
    } catch {
      // One malformed private record must not hide the rest of the albums.
    }
  }
  albums.sort((left, right) => right.date.localeCompare(left.date) || left.slug.localeCompare(right.slug))
  const body = JSON.stringify({ albums, updatedAt: new Date().toISOString() })
  return new Response(request.method === 'HEAD' ? null : body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
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
  if (stored && stored !== 'application/octet-stream') return stored
  const extension = key.slice(key.lastIndexOf('.')).toLowerCase()
  return {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.heic': 'image/heic', '.heif': 'image/heif',
    '.svg': SVG_TYPE, '.webp': 'image/webp',
  }[extension] || 'application/octet-stream'
}

async function readObject(env, key) {
  for (const candidate of sourceKeys(key)) {
    const object = await env.IMAGES_BUCKET.get(candidate)
    if (object?.body) return { object, sourceKey: candidate }
  }
  // Explicit migration aliases preserve links saved in old notes and cached pages.
  const aliases = await readImageAliases(env)
  for (const candidate of sourceKeys(key)) {
    const target = aliases[candidate]
    if (!target || target.bucket !== 'images' || !safeKey(target.key)) continue
    const object = await env.IMAGES_BUCKET.get(target.key)
    if (object?.body) return { object, sourceKey: target.key }
  }
  return null
}

async function readImageAliases(env) {
  if (!env.METADATA_BUCKET) return {}
  const object = await env.METADATA_BUCKET.get('image-aliases.json')
  return object?.body ? JSON.parse(await new Response(object.body).text()).objects || {} : {}
}

async function serveArchivedImage(request, env, url) {
  if (!['GET', 'HEAD'].includes(request.method)) return errorResponse(405, 'Method not allowed')
  // Older Obsidian notes used raw object URLs before the /webp route existed.
  const originalKey = safeKey(url.pathname.slice(1))
  if (originalKey) {
    const source = await readObject(env, originalKey)
    return source ? originalResponse(request, source.object, source.sourceKey) : errorResponse(404, 'Image not found')
  }
  let key
  try { key = decodeURIComponent(url.pathname.slice(1)) } catch { return errorResponse(404, 'Image not found') }
  if (!IMAGE_EXTENSION.test(key)) return errorResponse(404, 'Image not found')
  const aliases = await readImageAliases(env)
  const target = aliases[key]
  if (!target || target.bucket !== 'archive' || !env.ARCHIVE_BUCKET) return errorResponse(404, 'Image not found')
  const object = await env.ARCHIVE_BUCKET.get(target.key)
  return object?.body ? originalResponse(request, object, target.key) : errorResponse(404, 'Image not found')
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
      if (url.pathname === GALLERY_MANIFEST_PATH) {
        return await serveGalleryManifest(request, env)
      }
      const publicationRoute = /^\/webp\/gallery-status\/([a-f0-9-]{36})$/.exec(url.pathname)
      if (publicationRoute) return await galleryPublicationStatus(request, env, publicationRoute[1])

      if (url.pathname === '/internal/gallery/albums') {
        if (!galleryAuthorized(request, env)) return errorResponse(401, 'Unauthorized')
        return await createGalleryAlbum(request, env)
      }

      const galleryRoute = GALLERY_ALBUM_ROUTE.exec(url.pathname)
      if (galleryRoute) {
        if (!galleryAuthorized(request, env)) return errorResponse(401, 'Unauthorized')
        const [, id, action] = galleryRoute
        return action === 'photos'
          ? await uploadGalleryPhoto(request, env, id)
          : await publishGalleryAlbum(request, env, id)
      }

      return url.pathname.startsWith(PUBLIC_PREFIX)
        ? await serveImage(request, env, url)
        : await serveArchivedImage(request, env, url)
    } catch (error) {
      console.error(JSON.stringify({
        message: url.pathname.startsWith('/internal/gallery/')
          ? 'Gallery request failed'
          : 'Image conversion failed',
        path: url.pathname,
        error: error instanceof Error ? error.name : 'UnknownError',
      }))
      return errorResponse(
        502,
        url.pathname.startsWith('/internal/gallery/') ? 'Gallery request failed' : 'Image conversion failed',
      )
    }
  },
}

export default worker
