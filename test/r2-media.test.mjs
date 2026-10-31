import assert from 'node:assert/strict'
import test from 'node:test'
import { r2ObjectStem, r2Sources } from '../lib/r2-media.mjs'

test('normalizes owned image and video URLs to one R2 comparison stem', () => {
  assert.equal(
    r2ObjectStem('https://img.guanyan.me/webp/blog/obsidian/2026/10/photo.webp'),
    'blog/obsidian/2026/10/photo',
  )
  assert.equal(
    r2ObjectStem('https://img.215320.xyz/webp/v2/original/blog/obsidian/2026/10/photo.jpg'),
    'blog/obsidian/2026/10/photo',
  )
  assert.equal(
    r2ObjectStem('https://img.guanyan.me/webp/video/blog/obsidian/2026/10/clip.mov'),
    'blog/obsidian/2026/10/clip',
  )
  assert.equal(
    r2ObjectStem('/webp/v2/full/1080/center/blog/obsidian/2026/10/photo.webp'),
    'blog/obsidian/2026/10/photo',
  )
  assert.equal(r2ObjectStem('https://example.com/blog/obsidian/2026/10/photo.jpg'), null)
  assert.equal(r2ObjectStem('https://img.guanyan.me/webp/other/photo.jpg'), null)
})

test('collects unique R2 references from body and frontmatter without metadata history', () => {
  const sources = r2Sources([
    '![one](<https://img.guanyan.me/webp/blog/obsidian/2026/10/one.webp>)',
    '<video src="https://img.guanyan.me/webp/video/blog/obsidian/2026/10/clip.mov"></video>',
    '![external](https://example.com/outside.jpg)',
  ].join('\n'), {
    cover: 'https://img.guanyan.me/webp/blog/obsidian/2026/10/cover.webp',
    images: [{ src: 'https://img.guanyan.me/webp/blog/obsidian/2026/10/two.webp' }],
    mediaMetadata: [{ src: 'https://img.guanyan.me/webp/blog/obsidian/2026/10/removed.webp' }],
  })
  assert.deepEqual(sources.sort(), [
    'https://img.guanyan.me/webp/blog/obsidian/2026/10/cover.webp',
    'https://img.guanyan.me/webp/blog/obsidian/2026/10/one.webp',
    'https://img.guanyan.me/webp/blog/obsidian/2026/10/two.webp',
    'https://img.guanyan.me/webp/video/blog/obsidian/2026/10/clip.mov',
  ])
})
