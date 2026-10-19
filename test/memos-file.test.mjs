import assert from 'node:assert/strict'
import test from 'node:test'
import { proxyMemosImage } from '../lib/memos-file.mjs'

const IMAGE = '/api/memos/file/attachments/photo/%E7%85%A7%E7%89%87%201.jpg'
const SEGMENTS = ['attachments', 'photo', '照片 1.jpg']

function options(fetcher) {
  return {
    baseUrl: 'https://memos.example',
    token: 'test-private-token',
    allowedImages: async () => [IMAGE],
    fetcher,
  }
}

test('Memos proxy only sends credentials for images referenced by public notes', async (t) => {
  const fetcher = t.mock.fn(async () => new Response('image bytes', { headers: { 'Content-Type': 'image/jpeg' } }))
  const result = await proxyMemosImage(SEGMENTS, options(fetcher))
  assert.equal(result.status, 200)
  assert.equal(await result.text(), 'image bytes')
  const [url, init] = fetcher.mock.calls[0].arguments
  assert.equal(url, 'https://memos.example/file/attachments/photo/%E7%85%A7%E7%89%87%201.jpg')
  assert.equal(init.headers.Authorization, 'Bearer test-private-token')
  assert.equal(init.redirect, 'error')
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff')
  assert.equal((await proxyMemosImage(['attachments', 'private', 'photo.jpg'], options(fetcher))).status, 404)
  assert.equal(fetcher.mock.callCount(), 1)
})

test('Memos proxy rejects unsafe paths, active content, and upstream failures', async (t) => {
  const fetcher = t.mock.fn(async () => new Response('<script>unsafe</script>', { headers: { 'Content-Type': 'text/html' } }))
  for (const path of [['attachments', '..', 'photo.jpg'], ['attachments', 'photo', '../secret'], ['attachments', 'photo', '..']]) {
    assert.equal((await proxyMemosImage(path, options(fetcher))).status, 400)
  }
  assert.equal(fetcher.mock.callCount(), 0)
  assert.equal((await proxyMemosImage(SEGMENTS, options(fetcher))).status, 502)
  fetcher.mock.mockImplementation(async () => new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } }))
  assert.equal((await proxyMemosImage(SEGMENTS, options(fetcher))).status, 502)
  fetcher.mock.mockImplementation(async () => { throw new Error('test-private-token') })
  const failed = await proxyMemosImage(SEGMENTS, options(fetcher))
  assert.equal(failed.status, 502)
  assert.doesNotMatch(await failed.text(), /test-private-token/)
})
