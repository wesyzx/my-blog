import assert from 'node:assert/strict'
import test from 'node:test'
import worker from '../src/index.js'
import { albumRevision } from '../../../lib/publication-revision.mjs'

const ORIGINAL = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x04, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])

function object(body = ORIGINAL, contentType = 'image/jpeg') {
  return {
    body,
    httpEtag: '"source-etag"',
    httpMetadata: { contentType },
  }
}

function environment(t, { body = ORIGINAL, contentType = 'image/jpeg', conversionError = false } = {}) {
  const calls = []
  const env = {
    IMAGES_BUCKET: {
      async get(key) {
        calls.push({ type: 'get', key })
        return key === 'blog/obsidian/2026/10/photo.jpg' ? object(body, contentType) : null
      },
    },
    IMAGES: {
      input(stream) {
        calls.push({ type: 'input', stream })
        const chain = {
          transform(options) {
            calls.push({ type: 'transform', options })
            return chain
          },
          async output(options) {
            calls.push({ type: 'output', options })
            if (conversionError) throw new Error('conversion failed')
            return {
              response(responseOptions = {}) {
                calls.push({ type: 'response', responseOptions })
                const headers = new Headers(responseOptions.headers)
                headers.set('content-type', 'image/webp')
                return new Response(WEBP, {
                  status: 200,
                  headers,
                })
              },
            }
          },
        }
        return chain
      },
    },
  }
  t.after(() => assert.equal(calls.some((call) => call.type === 'get' && call.key.startsWith('..')), false))
  return { env, calls }
}

function imageRequest(path = '/webp/blog/obsidian/2026/10/photo.webp', headers = { accept: 'image/webp' }, method = 'GET') {
  return new Request(`https://images.example${path}`, { method, headers })
}

test('converts an R2 image to WebP with stable caching headers', async (t) => {
  const { env, calls } = environment(t)
  const response = await worker.fetch(imageRequest(), env)

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/webp')
  assert.equal(response.headers.get('etag'), '"source-etag-webp-2400-q82"')
  assert.match(response.headers.get('cache-control'), /immutable/)
  assert.equal(response.headers.get('vary'), 'accept')
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), WEBP)
  assert.deepEqual(calls.map((call) => call.type), [
    'get', 'get', 'input', 'transform', 'output', 'response',
  ])
  assert.equal(calls[0].key, 'blog/obsidian/2026/10/photo.webp')
  assert.equal(calls[1].key, 'blog/obsidian/2026/10/photo.jpg')
  assert.deepEqual(calls[3].options, { fit: 'scale-down', width: 2400 })
  assert.deepEqual(calls[4].options, { format: 'image/webp', quality: 82 })
})

test('honours the loader thumbnail and quality parameters', async (t) => {
  const { env, calls } = environment(t)
  const path = '/webp/blog/obsidian/2026/10/photo.webp?imageMogr2/thumbnail/256x/quality/75/format/webp'
  const response = await worker.fetch(imageRequest(path), env)

  assert.equal(response.status, 200)
  assert.deepEqual(calls.find((call) => call.type === 'transform').options, { fit: 'scale-down', width: 256 })
  assert.deepEqual(calls.find((call) => call.type === 'output').options, { format: 'image/webp', quality: 75 })
  // Distinct size ⇒ distinct validator, so caches never serve a tile for a hero.
  assert.equal(response.headers.get('etag'), '"source-etag-webp-256-q75"')
})

test('snaps crafted size parameters onto a fixed ladder of transformations', async (t) => {
  const { env, calls } = environment(t)
  const cases = [
    ['/webp/blog/obsidian/2026/10/photo.webp?imageMogr2/thumbnail/99999x/quality/75/format/webp', 2400, 75],
    ['/webp/blog/obsidian/2026/10/photo.webp?imageMogr2/thumbnail/256x/quality/1/format/webp', 256, 82],
    ['/webp/blog/obsidian/2026/10/photo.webp?imageMogr2/thumbnail/0256x/quality/100/format/webp', 256, 90],
    ['/webp/blog/obsidian/2026/10/photo.webp?imageMogr2/thumbnail/0x/format/webp', 2400, 82],
    ['/webp/blog/obsidian/2026/10/photo.webp?imageMogr2/thumbnail/2560x/quality/999/format/webp', 2400, 82],
    // Off-ladder values round up to the next served width, so a crawler that
    // walks every integer width still only ever triggers a dozen conversions.
    ['/webp/blog/obsidian/2026/10/photo.webp?imageMogr2/thumbnail/500x/quality/85/format/webp', 640, 82],
    ['/webp/blog/obsidian/2026/10/photo.webp?imageMogr2/thumbnail/1x/quality/50/format/webp', 32, 60],
  ]
  for (const [path, width, quality] of cases) {
    calls.length = 0
    await worker.fetch(imageRequest(path), env)
    assert.deepEqual(calls.find((call) => call.type === 'transform').options, { fit: 'scale-down', width }, path)
    assert.equal(calls.find((call) => call.type === 'output').options.quality, quality, path)
  }
})


test('serves the stored original when the client does not accept WebP', async (t) => {
  const { env, calls } = environment(t)
  for (const accept of ['*/*', 'image/jpeg', '']) {
    const response = await worker.fetch(imageRequest(undefined, accept ? { accept } : {}), env)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/jpeg')
    assert.equal(response.headers.get('etag'), '"source-etag"')
    assert.equal(response.headers.get('vary'), 'accept')
    // EdgeOne may not honour Vary, so the fallback must never be cached.
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), ORIGINAL)
  }
  // No conversion is attempted, so link previews cannot burn transformation quota.
  assert.equal(calls.some((call) => call.type === 'input'), false)
})

test('falls back to the requested extension when R2 has no stored type', async (t) => {
  const { env } = environment(t, { contentType: undefined })
  const response = await worker.fetch(imageRequest(undefined, { accept: '*/*' }), env)
  assert.equal(response.headers.get('content-type'), 'image/jpeg')
})

test('treats image/* and WebP-with-quality as accepting WebP', async (t) => {
  const { env } = environment(t)
  for (const accept of ['image/*', 'image/avif,image/webp,*/*;q=0.8', 'image/webp;q=0.5']) {
    const response = await worker.fetch(imageRequest(undefined, { accept }), env)
    assert.equal(response.headers.get('content-type'), 'image/webp')
  }
})

test('only revalidates WebP with its own validator', async (t) => {
  const { env, calls } = environment(t)
  const stale = await worker.fetch(imageRequest(undefined, { accept: 'image/webp', 'if-none-match': '"source-etag"' }), env)
  assert.equal(stale.status, 200)
  const conversionsAfterMiss = calls.filter((call) => call.type === 'output').length

  const response = await worker.fetch(imageRequest(undefined, { accept: 'image/webp', 'if-none-match': '"source-etag-webp-2400-q82"' }), env)
  assert.equal(response.status, 304)
  assert.equal(calls.filter((call) => call.type === 'get').length, 4)
  assert.equal(calls.filter((call) => call.type === 'output').length, conversionsAfterMiss)
})

test('supports HEAD for both representations without a body', async (t) => {
  const { env } = environment(t)
  const webp = await worker.fetch(imageRequest(undefined, { accept: 'image/webp' }, 'HEAD'), env)
  assert.equal(webp.status, 200)
  assert.equal(await webp.text(), '')
  assert.equal(webp.headers.get('content-type'), 'image/webp')

  const original = await worker.fetch(imageRequest(undefined, { accept: 'image/jpeg' }, 'HEAD'), env)
  assert.equal(original.status, 200)
  assert.equal(await original.text(), '')
  assert.equal(original.headers.get('content-type'), 'image/jpeg')
})

test('rejects missing images and traversal paths before R2 access', async (t) => {
  const { env, calls } = environment(t)
  assert.equal((await worker.fetch(imageRequest('/webp/blog/obsidian/2026/10/missing.webp'), env)).status, 404)
  assert.equal((await worker.fetch(imageRequest('/webp/blog/%2e%2e/private.webp'), env)).status, 404)
  assert.equal(calls.filter((call) => call.type === 'get').length, 8)
  assert.deepEqual(calls.slice(0, 8).map((call) => call.key), [
    'blog/obsidian/2026/10/missing.webp',
    'blog/obsidian/2026/10/missing.jpg',
    'blog/obsidian/2026/10/missing.jpeg',
    'blog/obsidian/2026/10/missing.png',
    'blog/obsidian/2026/10/missing.gif',
    'blog/obsidian/2026/10/missing.heic',
    'blog/obsidian/2026/10/missing.heif',
    'blog/obsidian/2026/10/missing.svg',
  ])
})

test('only exposes GET, HEAD and health requests', async (t) => {
  const { env } = environment(t)
  assert.equal((await worker.fetch(imageRequest(undefined, { accept: 'image/webp' }, 'POST'), env)).status, 405)
  assert.equal((await worker.fetch(imageRequest('/unexpected.jpg'), env)).status, 404)
  const health = await worker.fetch(new Request('https://images.example/health'), env)
  assert.deepEqual(await health.json(), { ok: true, formats: ['webp'] })
})

test('preserves raw Obsidian image links without exposing other bucket prefixes', async (t) => {
  const { env } = environment(t)
  const rawPath = new URL(imageRequest().url).pathname.replace('/webp/', '/').replace(/\.webp$/, '.jpg')
  const response = await worker.fetch(imageRequest(rawPath), env)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/jpeg')
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), ORIGINAL)
  assert.equal((await worker.fetch(imageRequest('/blog/%2e%2e/private.jpg'), env)).status, 404)
  assert.equal((await worker.fetch(imageRequest('/internal/private.jpg'), env)).status, 404)
})

test('redirects conversion failures to original bytes without poisoning the variant cache', async (t) => {
  const { env } = environment(t, { conversionError: true })
  const originalError = console.error
  console.error = () => {}
  t.after(() => { console.error = originalError })
  const response = await worker.fetch(imageRequest(), env)
  assert.equal(response.status, 302)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-image-fallback'), 'conversion-failed')
  const fallback = await worker.fetch(new Request(new URL(response.headers.get('location'), imageRequest().url)), env)
  assert.equal(fallback.headers.get('content-type'), 'image/jpeg')
  assert.deepEqual(new Uint8Array(await fallback.arrayBuffer()), ORIGINAL)
})

// --- versioned variant route ------------------------------------------------

function variantRequest(path, headers = { accept: 'image/webp' }) {
  return imageRequest(`/webp/v2/${path}`, headers)
}

test('crops card presets to their aspect ratio around a focal point', async (t) => {
  const { env, calls } = environment(t)
  const cases = [
    ['square/256/auto', { fit: 'crop', width: 256, height: 256, gravity: 'auto' }],
    ['landscape/640/top', { fit: 'crop', width: 640, height: 480, gravity: 'top' }],
    ['wide/1080/face', { fit: 'crop', width: 1080, height: 608, gravity: 'face' }],
    ['cover/1200/center', { fit: 'crop', width: 1200, height: 400 }],
    ['banner/1200/auto', { fit: 'crop', width: 1200, height: 600, gravity: 'auto' }],
    ['content/828/auto', { fit: 'crop', width: 828, height: 518, gravity: 'auto' }],
  ]
  for (const [path, transform] of cases) {
    calls.length = 0
    const response = await worker.fetch(variantRequest(`${path}/blog/obsidian/2026/10/photo.webp`), env)
    assert.equal(response.status, 200, path)
    assert.deepEqual(calls.find((call) => call.type === 'transform').options, transform, path)
    // Card tiles are small, so a lower quality than the lightbox full image.
    assert.equal(calls.find((call) => call.type === 'output').options.quality, 75, path)
  }
})

test('keeps aspect-preserving presets uncropped and ignores their focal point', async (t) => {
  const { env, calls } = environment(t)
  calls.length = 0
  await worker.fetch(variantRequest('fit/1200/auto/blog/obsidian/2026/10/photo.webp'), env)
  assert.deepEqual(calls.find((call) => call.type === 'transform').options, { fit: 'scale-down', width: 1200 })

  // The focal point is meaningless without a crop, so it is pinned in the URL
  // and in the ETag; a focus typo cannot split the cache into two variants.
  calls.length = 0
  const response = await worker.fetch(variantRequest('fit/1200/top/blog/obsidian/2026/10/photo.webp'), env)
  assert.deepEqual(calls.find((call) => call.type === 'transform').options, { fit: 'scale-down', width: 1200 })
  assert.equal(response.headers.get('etag'), '"source-etag-v2-fit-1200-center-q75"')
})

test('bounds the lightbox full image by its long edge at higher quality', async (t) => {
  const { env, calls } = environment(t)
  calls.length = 0
  const response = await worker.fetch(variantRequest('full/3840/center/blog/obsidian/2026/10/photo.webp'), env)
  assert.equal(response.status, 200)
  // Both bounds, so a tall portrait is capped at 3840 px tall rather than 5760.
  assert.deepEqual(calls.find((call) => call.type === 'transform').options, { fit: 'scale-down', width: 3840, height: 3840 })
  assert.equal(calls.find((call) => call.type === 'output').options.quality, 82)
  assert.equal(response.headers.get('etag'), '"source-etag-v2-full-3840-center-q82"')
})

test('rejects off-contract variants instead of minting new transformations', async (t) => {
  const { env, calls } = environment(t)
  const rejected = [
    // Off-ladder width: 500 would be a distinct transformation per integer.
    'landscape/500/auto/blog/obsidian/2026/10/photo.webp',
    'panorama/640/auto/blog/obsidian/2026/10/photo.webp',
    'square/640/sideways/blog/obsidian/2026/10/photo.webp',
    // 3840 belongs to `full` only.
    'landscape/3840/auto/blog/obsidian/2026/10/photo.webp',
    'full/999/center/blog/obsidian/2026/10/photo.webp',
    'square/8/auto/blog/obsidian/2026/10/photo.webp',
  ]
  for (const path of rejected) {
    const response = await worker.fetch(variantRequest(path), env)
    assert.equal(response.status, 404, path)
  }
  // Validation happens before R2, so junk URLs cost no storage reads.
  assert.equal(calls.filter((call) => call.type === 'get').length, 0)
})

test('explicit variants serve the same WebP bytes regardless of Accept', async (t) => {
  const { env } = environment(t)
  for (const accept of ['image/webp', '*/*', 'image/jpeg', '']) {
    const response = await worker.fetch(
      variantRequest('landscape/640/auto/blog/obsidian/2026/10/photo.webp', accept ? { accept } : {}), env,
    )
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/webp')
    assert.equal(response.headers.has('vary'), false)
    assert.equal(response.headers.has('location'), false)
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), WEBP)
  }
  const original = await worker.fetch(imageRequest('/webp/v2/original/blog/obsidian/2026/10/photo.webp'), env)
  assert.equal(original.headers.get('content-type'), 'image/jpeg')
  assert.deepEqual(new Uint8Array(await original.arrayBuffer()), ORIGINAL)
})

test('serves vector sources as-is because Images cannot decode them', async (t) => {
  const { env, calls } = environment(t, { contentType: 'image/svg+xml' })
  const response = await worker.fetch(variantRequest('square/256/auto/blog/obsidian/2026/10/photo.webp'), env)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/svg+xml')
  assert.equal(calls.some((call) => call.type === 'input'), false)

  const info = await worker.fetch(
    imageRequest('/webp/v2/info/blog/obsidian/2026/10/photo.webp'),
    env,
  )
  assert.equal(info.status, 415)
})

test('reports real dimensions for layout stability', async (t) => {
  const { env } = environment(t)
  env.IMAGES.info = async () => ({ width: 4032, height: 3024, format: 'image/jpeg', fileSize: 512000 })
  const response = await worker.fetch(
    imageRequest('/webp/v2/info/blog/obsidian/2026/10/photo.webp'),
    env,
  )
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    width: 4032,
    height: 3024,
    format: 'image/jpeg',
    fileSize: 512000,
  })
  assert.match(response.headers.get('cache-control'), /immutable/)
})


test('an explicit WebP exclusion overrides an image wildcard', async (t) => {
  const { env, calls } = environment(t)
  for (const accept of ['image/webp;q=0,image/*;q=1', 'image/webp;q=0.0', 'image/webp;q=bogus', 'image/webp2']) {
    const response = await worker.fetch(imageRequest(undefined, { accept }), env)
    assert.equal(response.status, 200, accept)
    assert.equal(response.headers.get('content-type'), 'image/jpeg')
  }
  assert.equal(calls.some((call) => call.type === 'input'), false)
})

test('direct Worker requests reject encoded separators, controls and prototype preset names', async (t) => {
  const { env, calls } = environment(t)
  for (const suffix of ['a%2Fb.webp', 'a%5Cb.webp', 'a%00.webp', '%252e%252e.webp', '%zz.webp', '/photo.webp']) {
    const response = await worker.fetch(variantRequest(`square/640/auto/blog/obsidian/2026/10/${suffix}`), env)
    assert.equal(response.status, 404, suffix)
  }
  for (const preset of ['constructor', 'toString', '__proto__']) {
    assert.equal((await worker.fetch(variantRequest(`${preset}/640/auto/blog/obsidian/2026/10/photo.webp`), env)).status, 404)
  }
  assert.equal(calls.length, 0)
})

test('variant encoder failure uses a relative, temporary fallback and HEAD metadata is bodyless', async (t) => {
  const { env } = environment(t, { conversionError: true })
  const originalError = console.error
  console.error = () => {}
  t.after(() => { console.error = originalError })
  for (const method of ['GET', 'HEAD']) {
    const url = 'https://img.215320.xyz/webp/v2/full/3840/center/blog/obsidian/2026/10/photo.webp'
    const response = await worker.fetch(new Request(url, { method, headers: { accept: 'image/webp' } }), env)
    assert.equal(response.status, 302)
    assert.equal(response.headers.get('location'), '/webp/v2/original/blog/obsidian/2026/10/photo.webp')
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(response.headers.has('etag'), false)
  }
  env.IMAGES.info = async () => ({ width: 4032, height: 3024 })
  const head = await worker.fetch(imageRequest('/webp/v2/info/blog/obsidian/2026/10/photo.webp', {}, 'HEAD'), env)
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
})

test('a storage outage remains a non-cacheable error rather than a redirect loop', async (t) => {
  const { env } = environment(t)
  env.IMAGES_BUCKET.get = async () => { throw new Error('R2 unavailable') }
  const originalError = console.error
  console.error = () => {}
  t.after(() => { console.error = originalError })
  const response = await worker.fetch(imageRequest(), env)
  assert.equal(response.status, 502)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.has('location'), false)
})

// --- authenticated gallery ingest -------------------------------------------

function galleryEnvironment({ token = 'gallery-secret', deployOk = true } = {}) {
  const objects = new Map()
  const deployCalls = []
  const env = {
    GALLERY_UPLOAD_TOKEN: token,
    EDGEONE_DEPLOY_WEBHOOK: 'https://edgeone.example/deploy',
    IMAGES_BUCKET: {
      async get(key) {
        const entry = objects.get(key)
        return entry ? { body: entry.body, httpMetadata: entry.httpMetadata } : null
      },
      async put(key, body, options = {}) {
        objects.set(key, { body: typeof body === 'string' ? body : new Uint8Array(body), httpMetadata: options.httpMetadata })
      },
      async list({ prefix }) {
        return { objects: [...objects.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key })) }
      },
    },
    IMAGES: {
      async info() {
        return { width: 4032, height: 3024, format: 'image/jpeg', fileSize: ORIGINAL.byteLength }
      },
    },
  }
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    if (url === env.EDGEONE_DEPLOY_WEBHOOK) {
      deployCalls.push({ url, options })
      return new Response(null, { status: deployOk ? 204 : 503 })
    }
    return originalFetch(url, options)
  }
  return {
    env,
    objects,
    deployCalls,
    restoreFetch() { globalThis.fetch = originalFetch },
  }
}

function galleryRequest(path, {
  method = 'POST',
  token = 'gallery-secret',
  body,
  contentType,
} = {}) {
  const headers = new Headers()
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (contentType) headers.set('content-type', contentType)
  return new Request(`https://images.example${path}`, { method, headers, body })
}

test('creates, uploads, deduplicates and publishes a gallery album', async (t) => {
  const gallery = galleryEnvironment()
  t.after(gallery.restoreFetch)

  const unauthorized = await worker.fetch(galleryRequest('/internal/gallery/albums', {
    token: 'wrong', body: '{}', contentType: 'application/json',
  }), gallery.env)
  assert.equal(unauthorized.status, 401)

  const created = await worker.fetch(galleryRequest('/internal/gallery/albums', {
    body: JSON.stringify({ title: '秋日散步', date: '2026-10-30', category: '日常' }),
    contentType: 'application/json',
  }), gallery.env)
  assert.equal(created.status, 200)
  const album = await created.json()
  assert.match(album.albumId, /^[a-f0-9-]{36}$/)
  assert.equal(album.slug, 'album')

  const first = await worker.fetch(galleryRequest(`/internal/gallery/albums/${album.albumId}/photos`, {
    body: ORIGINAL,
    contentType: 'image/jpeg',
  }), gallery.env)
  assert.equal(first.status, 200)
  const uploaded = await first.json()
  assert.equal(uploaded.duplicate, false)
  assert.deepEqual(uploaded.image, {
    src: uploaded.image.src,
    width: 4032,
    height: 3024,
    order: 0,
  })
  assert.match(uploaded.image.src, /\/blog\/obsidian\/2026\/10\/2026-10-30-[a-f0-9-]{36}-001\.webp$/)

  const duplicate = await worker.fetch(galleryRequest(`/internal/gallery/albums/${album.albumId}/photos`, {
    body: ORIGINAL,
    contentType: 'image/jpeg',
  }), gallery.env)
  assert.equal(duplicate.status, 200)
  assert.equal((await duplicate.json()).duplicate, true)

  const privateManifest = await worker.fetch(new Request('https://images.example/webp/gallery-manifest'), gallery.env)
  assert.equal(privateManifest.status, 200)
  assert.equal(privateManifest.headers.get('cache-control'), 'no-store')
  assert.deepEqual((await privateManifest.json()).albums, [])

  const published = await worker.fetch(galleryRequest(`/internal/gallery/albums/${album.albumId}/publish`), gallery.env)
  assert.equal(published.status, 200)
  assert.equal((await published.json()).deployTriggered, true)
  assert.equal(gallery.deployCalls.length, 1)

  const manifest = await worker.fetch(new Request('https://images.example/webp/gallery-manifest'), gallery.env)
  assert.equal(manifest.status, 200)
  const publicAlbum = (await manifest.json()).albums[0]
  assert.equal(publicAlbum.id, album.albumId)
  assert.equal(publicAlbum.title, '秋日散步')
  assert.equal(publicAlbum.images.length, 1)
  assert.equal(publicAlbum.cover, uploaded.image.src)
})

test('gallery upload rejects unsupported, oversized and missing albums', async (t) => {
  const gallery = galleryEnvironment()
  t.after(gallery.restoreFetch)
  const created = await worker.fetch(galleryRequest('/internal/gallery/albums', {
    body: JSON.stringify({ title: 'Test', date: '2026-10-30' }),
    contentType: 'application/json',
  }), gallery.env)
  const { albumId } = await created.json()

  assert.equal((await worker.fetch(galleryRequest(`/internal/gallery/albums/${albumId}/photos`, {
    body: ORIGINAL, contentType: 'text/plain',
  }), gallery.env)).status, 415)
  assert.equal((await worker.fetch(galleryRequest('/internal/gallery/albums/00000000-0000-0000-0000-000000000000/photos', {
    body: ORIGINAL, contentType: 'image/jpeg',
  }), gallery.env)).status, 404)
  const publish = await worker.fetch(galleryRequest(`/internal/gallery/albums/${albumId}/publish`), gallery.env)
  assert.equal(publish.status, 409)
})

test('gallery album dates accept leap days, default when omitted and reject invalid values', async (t) => {
  const gallery = galleryEnvironment()
  t.after(gallery.restoreFetch)

  for (const date of ['2025-02-29', '2026-13-01', '30-10-2026', '2026-10-30-extra']) {
    const response = await worker.fetch(galleryRequest('/internal/gallery/albums', {
      body: JSON.stringify({ title: 'Invalid date', date }), contentType: 'application/json',
    }), gallery.env)
    assert.equal(response.status, 400, date)
    assert.match((await response.json()).error, /YYYY-MM-DD/)
  }

  const leapDay = await worker.fetch(galleryRequest('/internal/gallery/albums', {
    body: JSON.stringify({ title: 'Leap day', date: '2024-02-29' }), contentType: 'application/json',
  }), gallery.env)
  assert.equal(leapDay.status, 200)
  const leapRecord = JSON.parse(gallery.objects.get(
    `internal/gallery/albums/${(await leapDay.json()).albumId}.json`,
  ).body)
  assert.equal(leapRecord.date, '2024-02-29')

  const omitted = await worker.fetch(galleryRequest('/internal/gallery/albums', {
    body: JSON.stringify({ title: 'Today' }), contentType: 'application/json',
  }), gallery.env)
  assert.equal(omitted.status, 200)
  const omittedRecord = JSON.parse(gallery.objects.get(
    `internal/gallery/albums/${(await omitted.json()).albumId}.json`,
  ).body)
  assert.match(omittedRecord.date, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(new Date(`${omittedRecord.date}T00:00:00.000Z`).toISOString().slice(0, 10), omittedRecord.date)
})

test('gallery publish reports an EdgeOne webhook failure without claiming success', async (t) => {
  const gallery = galleryEnvironment({ deployOk: false })
  t.after(gallery.restoreFetch)
  const created = await worker.fetch(galleryRequest('/internal/gallery/albums', {
    body: JSON.stringify({ title: 'Test', date: '2026-10-30' }),
    contentType: 'application/json',
  }), gallery.env)
  const { albumId } = await created.json()
  await worker.fetch(galleryRequest(`/internal/gallery/albums/${albumId}/photos`, {
    body: ORIGINAL, contentType: 'image/jpeg',
  }), gallery.env)
  const publish = await worker.fetch(galleryRequest(`/internal/gallery/albums/${albumId}/publish`), gallery.env)
  assert.equal(publish.status, 502)
  assert.match((await publish.json()).error, /HTTP 503/)
  const manifest = await worker.fetch(new Request('https://images.example/webp/gallery-manifest'), gallery.env)
  assert.deepEqual((await manifest.json()).albums, [])
})

test('gallery publish remains private without a deploy webhook', async (t) => {
  const gallery = galleryEnvironment()
  t.after(gallery.restoreFetch)
  delete gallery.env.EDGEONE_DEPLOY_WEBHOOK
  const created = await worker.fetch(galleryRequest('/internal/gallery/albums', {
    body: JSON.stringify({ title: 'Test', date: '2026-10-30' }),
    contentType: 'application/json',
  }), gallery.env)
  const { albumId } = await created.json()
  await worker.fetch(galleryRequest(`/internal/gallery/albums/${albumId}/photos`, {
    body: ORIGINAL,
    contentType: 'image/jpeg',
  }), gallery.env)
  const publish = await worker.fetch(galleryRequest(`/internal/gallery/albums/${albumId}/publish`), gallery.env)
  assert.equal(publish.status, 503)
  const manifest = await worker.fetch(new Request('https://images.example/webp/gallery-manifest'), gallery.env)
  assert.deepEqual((await manifest.json()).albums, [])
})

test('publication verification requires both the current build marker and the actual album page', async (t) => {
  const gallery = galleryEnvironment()
  t.after(gallery.restoreFetch)
  const created = await worker.fetch(galleryRequest('/internal/gallery/albums', {
    body: JSON.stringify({ title: 'Status <test>', date: '2026-10-30', slug: 'status-test' }),
    contentType: 'application/json',
  }), gallery.env)
  const { albumId } = await created.json()
  const statusUrl = `https://images.example/webp/gallery-status/${albumId}`
  assert.equal((await worker.fetch(new Request(statusUrl), gallery.env)).status, 404)
  await worker.fetch(galleryRequest(`/internal/gallery/albums/${albumId}/photos`, {
    body: ORIGINAL, contentType: 'image/jpeg',
  }), gallery.env)
  const published = await (await worker.fetch(galleryRequest(`/internal/gallery/albums/${albumId}/publish`), gallery.env)).json()
  assert.equal(published.stage, 'build_requested')
  assert.equal(published.url, statusUrl)
  assert.match(published.albumUrl, /guanyan.me\/gallery\/status-test$/)
  const html = await (await worker.fetch(new Request(statusUrl), gallery.env)).text()
  assert.ok(html.includes('Status &lt;test&gt;'))
  const rawAlbum = JSON.parse(gallery.objects.get(`internal/gallery/albums/${albumId}.json`).body)
  const revision = await albumRevision(rawAlbum)
  let markerRevision = 'old'
  let pageRevision = 'old'
  globalThis.fetch = async (url) => {
    if (String(url).includes('/publish-status.json')) {
      return Response.json({ version: 1, gallery_fresh: true, albums: [{ id: albumId, slug: 'status-test', revision: markerRevision }] })
    }
    return new Response(`<div data-gallery-revision="${pageRevision}"></div>`)
  }
  const status = async () => (await worker.fetch(new Request(`${statusUrl}?format=json`), gallery.env)).json()
  assert.equal((await status()).siteUpdated, false)
  markerRevision = revision
  assert.equal((await status()).siteUpdated, false, 'a fresh marker alone cannot verify an old page')
  pageRevision = revision
  assert.equal((await status()).stage, 'site_updated')
  globalThis.fetch = async () => { throw new Error('network unavailable') }
  assert.equal((await status()).siteUpdated, false, 'network failures cannot claim publication')
})

test('gallery accepts HEIC bytes when the Images binding can decode them', async (t) => {
  const gallery = galleryEnvironment()
  t.after(gallery.restoreFetch)
  const created = await worker.fetch(galleryRequest('/internal/gallery/albums', {
    body: JSON.stringify({ title: 'HEIC', date: '2026-10-30' }),
    contentType: 'application/json',
  }), gallery.env)
  const { albumId } = await created.json()
  const uploaded = await worker.fetch(galleryRequest(`/internal/gallery/albums/${albumId}/photos`, {
    body: ORIGINAL,
    contentType: 'image/heic',
  }), gallery.env)
  assert.equal(uploaded.status, 200)
  assert.ok([...gallery.objects.keys()].some((key) => key.endsWith('.heic')))
})

test('gallery makes duplicate album slugs unique and manifest pagination complete', async (t) => {
  const objects = new Map()
  const env = {
    GALLERY_UPLOAD_TOKEN: 'gallery-secret',
    EDGEONE_DEPLOY_WEBHOOK: 'https://edgeone.example/deploy',
    IMAGES_BUCKET: {
      async get(key) {
        const entry = objects.get(key)
        return entry ? { body: entry.body, httpMetadata: entry.httpMetadata } : null
      },
      async put(key, body, options = {}) {
        objects.set(key, { body: typeof body === 'string' ? body : new Uint8Array(body), httpMetadata: options.httpMetadata })
      },
      async list({ prefix, cursor }) {
        const keys = [...objects.keys()].filter((key) => key.startsWith(prefix))
        if (cursor) return { objects: keys.slice(1).map((key) => ({ key })), truncated: false }
        return { objects: keys.slice(0, 1).map((key) => ({ key })), truncated: keys.length > 1, cursor: 'next' }
      },
    },
    IMAGES: { async info() { return { width: 10, height: 20 } } },
  }
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    assert.equal(url, env.EDGEONE_DEPLOY_WEBHOOK)
    return new Response(null, { status: 204 })
  }
  t.after(() => { globalThis.fetch = originalFetch })
  const created = []
  for (let index = 0; index < 2; index += 1) {
    const response = await worker.fetch(galleryRequest('/internal/gallery/albums', {
      body: JSON.stringify({ title: '同名', date: '2026-10-30' }),
      contentType: 'application/json',
    }), env)
    created.push(await response.json())
  }
  assert.notEqual(created[0].slug, created[1].slug)
  assert.equal(created[1].slug, 'album-2')

  for (const album of created) {
    const photo = await worker.fetch(galleryRequest(`/internal/gallery/albums/${album.albumId}/photos`, {
      body: ORIGINAL, contentType: 'image/jpeg',
    }), env)
    assert.equal(photo.status, 200)
    await worker.fetch(galleryRequest(`/internal/gallery/albums/${album.albumId}/publish`), env)
  }
  const manifest = await worker.fetch(new Request('https://images.example/webp/gallery-manifest'), env)
  assert.equal((await manifest.json()).albums.length, 2)
})

test('gallery stores metadata separately and reserves readable links and historical aliases', async (t) => {
  const gallery = galleryEnvironment()
  t.after(gallery.restoreFetch)
  const metadata = new Map()
  gallery.env.METADATA_BUCKET = {
    async get(key) { return metadata.has(key) ? { body: metadata.get(key) } : null },
    async put(key, body) { metadata.set(key, body) },
    async list() { return { objects: [...metadata.keys()].map((key) => ({ key })) } },
  }
  const create = (slug) => worker.fetch(galleryRequest('/internal/gallery/albums', {
    body: JSON.stringify({ title: '满月', slug }), contentType: 'application/json',
  }), gallery.env)
  assert.equal((await create('../private')).status, 400)
  assert.equal((await create('满月')).status, 400)
  const first = await (await create('tuotuo-first-month')).json()
  const key = `internal/gallery/albums/${first.albumId}.json`
  const record = JSON.parse(metadata.get(key))
  record.aliases = ['first-month']
  metadata.set(key, JSON.stringify(record))
  assert.equal((await (await create('tuotuo-first-month')).json()).slug, 'tuotuo-first-month-2')
  assert.equal((await (await create('first-month')).json()).slug, 'first-month-2')
  assert.equal(gallery.objects.size, 0)
  assert.equal(metadata.size, 3)
})

test('migrated photo aliases serve the original bytes and archive metadata remains private', async (t) => {
  const { env } = environment(t)
  const oldKey = 'blog/obsidian/gallery/2026/10/old/001.jpg'
  env.METADATA_BUCKET = { async get(key) {
    if (key !== 'image-aliases.json') return null
    return { body: JSON.stringify({ objects: {
      [oldKey]: { bucket: 'images', key: 'blog/obsidian/2026/10/photo.jpg' },
      'cdn/old.jpg': { bucket: 'archive', key: 'legacy/cdn/old.jpg' },
    } }) }
  } }
  env.ARCHIVE_BUCKET = { async get(key) {
    return key === 'legacy/cdn/old.jpg' ? object(ORIGINAL, 'application/octet-stream') : null
  } }
  const migrated = await worker.fetch(imageRequest('/webp/v2/original/' + oldKey), env)
  assert.equal(migrated.status, 200)
  assert.deepEqual(new Uint8Array(await migrated.arrayBuffer()), ORIGINAL)
  const archived = await worker.fetch(imageRequest('/cdn/old.jpg'), env)
  assert.equal(archived.status, 200)
  assert.equal(archived.headers.get('content-type'), 'image/jpeg')
  assert.equal((await worker.fetch(imageRequest('/cdn/.watermelon/months/2026-09.sqlite'), env)).status, 404)
  assert.equal((await worker.fetch(imageRequest('/internal/gallery/albums/private.json'), env)).status, 404)
})
