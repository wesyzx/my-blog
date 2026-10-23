import assert from 'node:assert/strict'
import test from 'node:test'
import worker from '../src/index.js'
import { BLOG_IMAGE_WIDTHS, blogImageUrl, blogImageInfoUrl } from '../../../lib/blog-images.mjs'

const SOURCE = 'https://img.guanyan.me/webp/blog/obsidian/2026/10/photo.webp'
const KEY = 'blog/obsidian/2026/10/photo.webp'
const ORIGINAL = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])

/**
 * The site and the Worker are deployed separately, so the only thing keeping
 * them compatible is this URL contract. Generating the links with the real
 * helper and requesting them from the real Worker catches drift such as a new
 * preset the Worker does not know, or a width the Worker rejects.
 */
function environment() {
  return {
    IMAGES_BUCKET: {
      async get(key) {
        if (key === KEY) {
          return { body: ORIGINAL, httpEtag: '"etag"', httpMetadata: { contentType: 'image/jpeg' } }
        }
        return null
      },
    },
    IMAGES: {
      info: async () => ({ width: 4032, height: 3024, format: 'image/jpeg', fileSize: 1 }),
      input() {
        const chain = {
          transform() { return chain },
          async output() {
            return {
              response(options = {}) {
                const headers = new Headers(options.headers)
                headers.set('content-type', 'image/webp')
                return new Response(new Uint8Array([1]), { status: 200, headers })
              },
            }
          },
        }
        return chain
      },
    },
  }
}

function get(path, accept = 'image/webp') {
  return worker.fetch(new Request(`https://img.guanyan.me${path}`, { headers: { accept } }), environment())
}

test('every preset the site can emit is served by the Worker', async () => {
  for (const preset of ['fit', 'full', 'square', 'landscape', 'wide', 'cover', 'banner', 'content']) {
    for (const width of [32, 384, 640, 2400]) {
      const url = blogImageUrl(SOURCE, { preset, width })
      const response = await get(new URL(url).pathname)
      assert.equal(response.status, 200, `${preset}/${width} → ${url}`)
    }
  }
})

test('every width in the srcset ladder is accepted, including full at 3840', async () => {
  const widths = BLOG_IMAGE_WIDTHS.map((width) => blogImageUrl(SOURCE, { preset: 'fit', width }))
  widths.push(blogImageUrl(SOURCE, { preset: 'full' }))
  for (const url of widths) {
    const response = await get(new URL(url).pathname)
    assert.equal(response.status, 200, url)
  }
})

test('the lightbox never asks for a crop', async () => {
  const url = blogImageUrl(`${SOURCE}?focus=top`, { preset: 'full' })
  assert.match(url, /\/webp\/v2\/full\/3840\/center\//)
  assert.equal((await get(new URL(url).pathname)).status, 200)
})

test('metadata links resolve to real dimensions', async () => {
  const response = await get(new URL(blogImageInfoUrl(SOURCE)).pathname)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { width: 4032, height: 3024, format: 'image/jpeg', fileSize: 1 })
})

test('fixed-format URLs are cache-safe for clients with generic Accept headers', async () => {
  for (const preset of ['fit', 'square', 'banner', 'full']) {
    const url = blogImageUrl(SOURCE, { preset, width: 640 })
    const response = await get(new URL(url).pathname, '*/*')
    assert.equal(response.status, 200, preset)
    assert.equal(response.headers.get('content-type'), 'image/webp', preset)
    assert.equal(response.headers.has('vary'), false)
  }
  const original = await get(`/webp/v2/original/${KEY}`, '*/*')
  assert.equal(original.status, 200)
  assert.equal(original.headers.get('content-type'), 'image/jpeg')
})
