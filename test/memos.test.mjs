import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchMemos, fetchMemosWithFallback, parseMemos } from '../lib/memos.mjs'

test('normalizes modern attachments, proxies local files and removes duplicate images', () => {
  const [memo] = parseMemos({ memos: [{
    name: 'memos/note-1',
    state: 'NORMAL', visibility: 'PUBLIC',
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

test('proxies markdown images from the configured Memos origin', () => {
  const memos = { memos: [{
    name: 'memos/note-1',
    state: 'NORMAL', visibility: 'PUBLIC',
    content: [
      '![local](https://notes.example/file/attachments/photo/a.jpg)',
      '![other](https://memos.guanyan.me/file/attachments/photo/b.jpg)',
    ].join('\n'),
  }] }
  const [memo] = parseMemos(memos, 'https://notes.example')
  assert.deepEqual(memo.images, [
    '/api/memos/file/attachments/photo/a.jpg',
    'https://memos.guanyan.me/file/attachments/photo/b.jpg',
  ])
})

test('supports legacy resources and memo identifiers', () => {
  const [memo] = parseMemos({ memos: [{
    uid: 'legacy-note',
    state: 'NORMAL', visibility: 'PUBLIC',
    displayTime: '2026-10-16T00:00:00Z',
    resources: [{ id: 'photo', filename: 'old.jpg', type: 'image/jpeg' }],
  }] })
  assert.equal(memo.slug, 'legacy-note')
  assert.equal(memo.date, '2026-10-16T00:00:00Z')
  assert.equal(memo.image, '/api/memos/file/attachments/photo/old.jpg')
})

test('keeps valid memo locations and drops invalid coordinates', () => {
  const [withLocation, invalidLocation] = parseMemos({ memos: [
    {
      name: 'memos/place-1',
      state: 'NORMAL', visibility: 'PUBLIC',
      createTime: '2026-10-17T00:00:00Z',
      content: 'A place',
      location: { placeholder: '天一阁', latitude: 29.8733, longitude: 121.5426 },
    },
    {
      name: 'memos/place-2',
      state: 'NORMAL', visibility: 'PUBLIC',
      createTime: '2026-10-16T00:00:00Z',
      content: 'Nowhere',
      location: { placeholder: '0,0', latitude: 0, longitude: 181 },
    },
  ] })
  assert.equal(withLocation.location, '天一阁')
  assert.equal(withLocation.latitude, 29.8733)
  assert.equal(withLocation.longitude, 121.5426)
  assert.equal(invalidLocation.location, undefined)
  assert.equal(invalidLocation.latitude, undefined)
  assert.equal(invalidLocation.longitude, undefined)
})

test('omits archived notes and records without identifiers', () => {
  assert.deepEqual(parseMemos({ memos: [
    { id: 'archived', state: 'ARCHIVED', content: 'hidden' },
    { state: 'NORMAL', visibility: 'PUBLIC', content: 'no id' },
  ] }), [])
})

test('owner authentication cannot publish private, protected, or unspecified notes', () => {
  const memos = ['PUBLIC', 3, 'PRIVATE', 'PROTECTED', 0, 1, 2, undefined].map((visibility, index) => ({
    id: String(index), state: 'NORMAL', visibility, content: 'A note',
  }))
  assert.deepEqual(parseMemos({ memos }).map((memo) => memo.slug), ['0', '1'])
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

test('a live memo resolves its address without sending Memos credentials to Tencent', async (t) => {
  const previousKey = process.env.TMAP_SERVER_KEY
  process.env.TMAP_SERVER_KEY = 'live-address-key'
  t.after(() => {
    if (previousKey === undefined) delete process.env.TMAP_SERVER_KEY
    else process.env.TMAP_SERVER_KEY = previousKey
  })
  const request = t.mock.method(globalThis, 'fetch', async (url) => {
    if (new URL(url).hostname === 'memos.example') return Response.json({ memos: [{
      name: 'memos/live-location',
      state: 'NORMAL', visibility: 'PUBLIC',
      location: { latitude: 39.9, longitude: 116.3, placeholder: '39.9, 116.3' },
    }] })
    return Response.json({ status: 0, result: { address: '北京市海淀区' } })
  })
  const [note] = await fetchMemos('https://memos.example/api/v1/memos', 'private-memos-token')
  assert.equal(note.location, '北京市海淀区')
  assert.equal(request.mock.callCount(), 2)
  const [url, options] = request.mock.calls[1].arguments
  assert.equal(new URL(url).hostname, 'apis.map.qq.com')
  assert.equal(new URL(url).searchParams.get('key'), 'live-address-key')
  assert.equal(options.headers?.Authorization, undefined)
})

for (const failure of ['missing-token', 'unauthorized', 'offline']) {
  test(`snapshot coordinates are resolved after ${failure}, without modifying the snapshot`, async (t) => {
    const previousKey = process.env.TMAP_SERVER_KEY
    process.env.TMAP_SERVER_KEY = `snapshot-${failure}-key`
    t.after(() => {
      if (previousKey === undefined) delete process.env.TMAP_SERVER_KEY
      else process.env.TMAP_SERVER_KEY = previousKey
    })
    const snapshot = [{ slug: 'saved-location', date: '', content: 'Saved note', latitude: 39.9, longitude: 116.3, location: '39.9, 116.3' }]
    const request = t.mock.method(globalThis, 'fetch', async (url) => {
      if (new URL(url).hostname === 'memos.example') {
        if (failure === 'offline') throw new Error('offline')
        return new Response(null, { status: 401 })
      }
      return Response.json({ status: 0, result: { address: '北京市海淀区' } })
    })
    const fallback = t.mock.fn(() => snapshot)
    const [note] = await fetchMemosWithFallback(
      'https://memos.example/api/v1/memos',
      failure === 'missing-token' ? undefined : 'expired-token',
      { cache: 'no-store' },
      fallback,
    )
    assert.equal(fallback.mock.callCount(), 1)
    assert.equal(note.location, '北京市海淀区')
    assert.equal(snapshot[0].location, '39.9, 116.3')
    assert.equal(request.mock.callCount(), failure === 'missing-token' ? 1 : 2)
  })
}

test('the fallback loader never restores snapshot notes after a successful empty response', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ memos: [] }))
  const fallback = t.mock.fn(() => [{ slug: 'deleted-note', date: '', content: 'Deleted' }])
  assert.deepEqual(await fetchMemosWithFallback('https://memos.example/api/v1/memos', 'token', {}, fallback), [])
  assert.equal(fallback.mock.callCount(), 0)
})
