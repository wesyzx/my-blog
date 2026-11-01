import { signR2Upload } from './r2-upload-signing.mjs'

const UPLOAD_PREFIX = 'internal/gallery/video-uploads/'
const MAX_VIDEO_BYTES = 5 * 1024 ** 3
const MAX_METADATA_BYTES = 8 * 1024 ** 2
const VIDEO_TYPES = new Map([
  ['video/quicktime', 'mov'], ['video/mp4', 'mp4'], ['video/x-m4v', 'm4v'],
])

function respond(value, status = 200) {
  return Response.json(value, { status, headers: { 'cache-control': 'no-store' } })
}

const fail = (status, error) => respond({ error }, status)
const bucket = (env) => env.METADATA_BUCKET || env.IMAGES_BUCKET
const sessionKey = (id) => `${UPLOAD_PREFIX}${id}.json`

async function readDimensions(env, key, size, parseDimensions) {
  // Skip mdat by its declared length; never buffer the video itself.
  for (let offset = 0, count = 0; offset + 8 <= size && count < 128; count += 1) {
    const header = await env.IMAGES_BUCKET.get(key, {
      range: { offset, length: Math.min(16, size - offset) },
    })
    if (!header) return null
    const bytes = new Uint8Array(await new Response(header.body).arrayBuffer())
    if (bytes.byteLength < 8) return null
    const view = new DataView(bytes.buffer)
    let length = view.getUint32(0)
    const type = String.fromCharCode(...bytes.slice(4, 8))
    let headerLength = 8
    if (length === 1) {
      if (bytes.byteLength < 16) return null
      length = view.getUint32(8) * 2 ** 32 + view.getUint32(12)
      headerLength = 16
    } else if (length === 0) {
      length = size - offset
    }
    if (!Number.isSafeInteger(length) || length < headerLength || offset + length > size) return null
    if (type === 'moov') {
      if (length > MAX_METADATA_BYTES) return null
      const metadata = await env.IMAGES_BUCKET.get(key, { range: { offset, length } })
      if (!metadata) return null
      return parseDimensions(new Uint8Array(await new Response(metadata.body).arrayBuffer()))
    }
    offset += length
  }
  return null
}

export async function handleDirectVideoUpload(request, env, albumId, uploadId, services) {
  if (request.method !== 'POST') return fail(405, 'Method not allowed')
  const album = await services.readAlbum(env, albumId)
  if (!album) return fail(404, 'Album not found')
  if (album.published === true) return fail(409, 'Published albums are immutable')

  if (!uploadId) {
    if (album.images.length >= 100) return fail(413, 'Album media limit reached')
    if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      return fail(503, 'Direct video upload is not configured')
    }
    let input
    try { input = await request.json() } catch { return fail(400, 'Invalid JSON') }
    const contentType = input?.contentType
    const extension = VIDEO_TYPES.get(contentType)
    if (!extension) return fail(415, 'Use a QuickTime or MP4 video')
    const id = crypto.randomUUID()
    const [year, month] = album.date.split('-')
    const key = `blog/obsidian/${year}/${month}/${album.date}-${album.id}-${id}.${extension}`
    const uploadUrl = await signR2Upload({
      accountId: env.R2_ACCOUNT_ID, accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY, bucket: 'blog-images', key, contentType,
    })
    const session = {
      id, albumId, key, contentType, expiresAt: Date.now() + 24 * 3600_000,
    }
    await bucket(env).put(sessionKey(id), JSON.stringify(session), {
      httpMetadata: { contentType: 'application/json' },
    })
    return respond({ ok: true, uploadId: id, uploadUrl, maxBytes: MAX_VIDEO_BYTES,
      completeUrl: `${new URL(request.url).origin}/internal/gallery/albums/${albumId}/video-uploads/${id}/complete` })
  }

  const stored = await bucket(env).get(sessionKey(uploadId))
  if (!stored?.body) return fail(404, 'Video upload session not found')
  const session = JSON.parse(await new Response(stored.body).text())
  if (session.albumId !== albumId) return fail(404, 'Video upload session not found')
  const previous = album.images.find((media) => media.uploadId === uploadId)
  if (previous) return respond({ ok: true, duplicate: true, video: services.publicGalleryMedia(previous, previous.order) })
  if (session.expiresAt < Date.now()) return fail(410, 'Video upload session expired; please retry')
  if (album.images.length >= 100) return fail(413, 'Album media limit reached')
  const object = await env.IMAGES_BUCKET.head(session.key)
  if (!object) return fail(409, 'R2 has not received the video; check the upload response')
  if (!object.size || object.size > MAX_VIDEO_BYTES) return fail(413, 'Video must be between 1 byte and 5 GiB')
  if (object.httpMetadata?.contentType !== session.contentType) return fail(415, 'Video content type does not match')
  const dimensions = await readDimensions(env, session.key, object.size, services.videoTrackDimensions)
  if (!dimensions || dimensions.width > 16384 || dimensions.height > 16384) {
    return fail(422, 'Cannot read video dimensions; upload a valid QuickTime or MP4 video')
  }
  const video = {
    kind: 'video', src: `https://img.guanyan.me/webp/video/${session.key}`,
    ...dimensions, order: album.images.length, uploadId,
    mimeType: session.contentType,
  }
  album.images.push(video)
  await services.writeAlbum(env, album)
  return respond({ ok: true, duplicate: false, video: services.publicGalleryMedia(video, video.order) })
}
