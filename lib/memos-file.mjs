const PROXY_PREFIX = '/api/memos/file'
const IMAGE_TYPE = /^image\/(?:avif|bmp|gif|jpeg|png|webp|x-icon|vnd\.microsoft\.icon)(?:;|$)/i

export async function proxyMemosImage(segments, { baseUrl, token, allowedImages, fetcher = fetch }) {
  const error = (message, status) => Response.json({ error: message }, { status })
  if (!Array.isArray(segments) || segments.length !== 3 || segments[0] !== 'attachments'
    || !/^[A-Za-z0-9_-]+$/.test(segments[1])
    || !segments[2] || /^[.]{1,2}$/.test(segments[2]) || /[/\\\0-\x1f]/.test(segments[2])) {
    return error('Unsupported Memos file path', 400)
  }
  if (!token) return error('MEMOS_TOKEN is not configured', 503)
  const relative = segments.map(encodeURIComponent).join('/')
  try {
    // An authenticated attachment endpoint must not become a public gateway to private files.
    const images = await allowedImages()
    if (!images.includes(`${PROXY_PREFIX}/${relative}`)) return error('Image not found', 404)
    const upstream = await fetcher(`${baseUrl.replace(/\/+$/, '')}/file/${relative}`, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    if (!upstream.ok || !upstream.body) {
      await upstream.body?.cancel()
      return error('Image unavailable', upstream.status === 404 ? 404 : 502)
    }
    const contentType = upstream.headers.get('content-type') || ''
    if (!IMAGE_TYPE.test(contentType)) {
      await upstream.body.cancel()
      return error('Unsupported image type', 502)
    }
    return new Response(upstream.body, {
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch {
    return error('Image unavailable', 502)
  }
}
