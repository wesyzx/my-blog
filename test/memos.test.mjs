import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchMemos, parseMemos } from '../lib/memos.mjs'

test('normalizes modern attachments, proxies local files and removes duplicate images', () => {
  const [memo] = parseMemos({ memos: [{
    name: 'memos/note-1',
    state: 'NORMAL',
    createTime: '2026-10-17T00:00:00Z',
    content: 'A note\n![photo](https://memos.guanyan.me/file/attachments/photo/a.jpg)',
    attachments: [
      { name: 'attachments/photo', filename: 'a.jpg', type: 'image/jpeg' },
      { name: 'attachments/audio', filename: 'a.mp3', type: 'audio/mpeg' },
      { externalLink: 'https://images.example/b.jpg' },
    ],
  }] })
  assert.deepEqual(memo, {
    slug: 'note-1',
    date: '2026-10-17T00:00:00Z',
    content: 'A note',
    image: '/api/memos/file/attachments/photo/a.jpg',
    images: ['/api/memos/file/attachments/photo/a.jpg', 'https://images.example/b.jpg'],
  })
})

test('supports legacy resources and memo identifiers', () => {
  const [memo] = parseMemos({ memos: [{
    uid: 'legacy-note',
    state: 'NORMAL',
    displayTime: '2026-10-16T00:00:00Z',
    resources: [{ id: 'photo', filename: 'old.jpg', type: 'image/jpeg' }],
  }] })
  assert.equal(memo.slug, 'legacy-note')
  assert.equal(memo.date, '2026-10-16T00:00:00Z')
  assert.equal(memo.image, '/api/memos/file/attachments/photo/old.jpg')
})

test('omits archived notes and records without identifiers', () => {
  assert.deepEqual(parseMemos({ memos: [
    { id: 'archived', state: 'ARCHIVED', content: 'hidden' },
    { state: 'NORMAL', content: 'no id' },
  ] }), [])
})

test('a successful empty response stays empty instead of restoring deleted notes', async (t) => {
  const request = t.mock.method(globalThis, 'fetch', async () => Response.json({ memos: [] }))
  assert.deepEqual(await fetchMemos('https://memos.example/api/v1/memos', 'test-token', { cache: 'no-store' }), [])
  const [url, options] = request.mock.calls[0].arguments
  assert.equal(url, 'https://memos.example/api/v1/memos?pageSize=20')
  assert.equal(options.cache, 'no-store')
  assert.equal(options.headers.Authorization, 'Bearer test-token')
})

test('missing credentials fail before requesting private notes', async (t) => {
  const request = t.mock.method(globalThis, 'fetch', async () => Response.json({}))
  await assert.rejects(fetchMemos('https://memos.example/api/v1/memos', undefined), /MEMOS_TOKEN/)
  assert.equal(request.mock.callCount(), 0)
})

test('HTTP and network failures remain errors so callers can use their snapshot', async (t) => {
  const request = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 401 }))
  await assert.rejects(fetchMemos('https://memos.example/api/v1/memos', 'token'), /HTTP 401/)
  request.mock.mockImplementation(async () => { throw new Error('offline') })
  await assert.rejects(fetchMemos('https://memos.example/api/v1/memos', 'token'), /offline/)
})
