import assert from 'node:assert/strict'
import test from 'node:test'
import { albumRevision } from '../lib/publication-revision.mjs'

const album = {
  id: 'album-id',
  slug: 'mixed',
  title: 'Mixed gallery',
  date: '2026-10-30',
  images: [
    { kind: 'image', src: 'https://img.guanyan.me/webp/photo.webp', width: 1200, height: 800 },
    {
      kind: 'video',
      src: 'https://img.guanyan.me/webp/video/video.mp4',
      width: 1920,
      height: 1080,
      duration: 12,
      mimeType: 'video/mp4',
    },
  ],
}

test('legacy media hashes as an image without changing published revisions', async () => {
  const legacy = {
    ...album,
    images: [{ src: album.images[0].src, width: 1200, height: 800 }],
  }
  const explicit = {
    ...album,
    images: [{ ...album.images[0], kind: 'image' }],
  }
  assert.equal(await albumRevision(legacy), await albumRevision(explicit))
})

test('video metadata participates in the publication revision', async () => {
  const before = await albumRevision(album)
  const after = await albumRevision({
    ...album,
    images: [album.images[0], { ...album.images[1], duration: 13 }],
  })
  assert.notEqual(before, after)
})
