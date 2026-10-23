import assert from 'node:assert/strict'
import test from 'node:test'
import { BLOG_IMAGE_WIDTHS, blogImageCropDisabled, blogImageInfoUrl, blogImageUrl, isBlogImage } from '../lib/blog-images.mjs'

const legacy = 'https://img.215320.xyz/webp/blog/obsidian/2026/10/photo.webp'

test('recognizes only the two owned hosts and the agreed blog routes', () => {
  assert.equal(isBlogImage(legacy), true)
  assert.equal(isBlogImage('https://img.guanyan.me/webp/blog/obsidian/2026/10/photo.webp'), true)
  assert.equal(isBlogImage('https://img.guanyan.me/webp/v2/fit/1080/top/blog/obsidian/2026/10/photo.webp'), true)
  assert.equal(isBlogImage('https://img.guanyan.me/webp/v2/full/3840/face/blog/obsidian/2026/10/photo.webp'), true)
  for (const source of [
    'https://example.com/webp/blog/obsidian/2026/10/photo.webp',
    'https://img.guanyan.me/webp/blog/obsidian/2026/10/photo.jpg',
    'https://img.guanyan.me/webp/blog/obsidian/../secret.webp',
    'https://img.guanyan.me/webp/blog/obsidian/2026/10/%252e%252e.webp',
    'https://img.guanyan.me/webp/v2/nope/1080/center/blog/obsidian/2026/10/photo.webp',
    'https://img.guanyan.me/webp/v2/fit/3840/center/blog/obsidian/2026/10/photo.webp',
    '/webp/blog/obsidian/2026/10/photo.webp',
    null,
  ]) assert.equal(isBlogImage(source), false, String(source))
})

test('normalizes both legacy hosts onto the Worker origin and canonical keys', () => {
  assert.equal(
    blogImageUrl(legacy, { preset: 'fit', width: 750 }),
    'https://img.guanyan.me/webp/v2/fit/750/center/blog/obsidian/2026/10/photo.webp',
  )
  assert.equal(
    blogImageUrl('https://img.guanyan.me/webp/blog/obsidian/2026/10/photo%20one.webp'),
    'https://img.guanyan.me/webp/v2/fit/2400/center/blog/obsidian/2026/10/photo%20one.webp',
  )
  assert.equal(
    blogImageUrl('https://img.guanyan.me/webp/v2/square/1080/top/blog/obsidian/2026/10/photo.webp', { preset: 'square', width: 400 }),
    'https://img.guanyan.me/webp/v2/square/640/top/blog/obsidian/2026/10/photo.webp',
  )
})

test('rounds widths onto the fixed ladder and reserves 3840 for full', () => {
  assert.equal(blogImageUrl(legacy, { width: 1 }), 'https://img.guanyan.me/webp/v2/fit/32/center/blog/obsidian/2026/10/photo.webp')
  assert.equal(blogImageUrl(legacy, { width: 500 }), 'https://img.guanyan.me/webp/v2/fit/640/center/blog/obsidian/2026/10/photo.webp')
  assert.equal(blogImageUrl(legacy, { width: 9999 }), 'https://img.guanyan.me/webp/v2/fit/2400/center/blog/obsidian/2026/10/photo.webp')
  assert.equal(blogImageUrl(legacy, { preset: 'full', width: 9999 }), 'https://img.guanyan.me/webp/v2/full/3840/center/blog/obsidian/2026/10/photo.webp')
  for (const width of BLOG_IMAGE_WIDTHS) {
    assert.match(blogImageUrl(legacy, { width }), new RegExp(`/fit/${width}/center/`))
  }
  assert.throws(() => blogImageUrl(legacy, { width: 0 }), RangeError)
  assert.throws(() => blogImageUrl(legacy, { width: Number.NaN }), RangeError)
})

test('fit and full ignore focus; crop presets honour auto and explicit focus', () => {
  const scoped = 'https://img.guanyan.me/webp/blog/obsidian/2026/10/photo.webp?focus=top'
  assert.equal(blogImageUrl(scoped, { preset: 'fit' }), 'https://img.guanyan.me/webp/v2/fit/2400/center/blog/obsidian/2026/10/photo.webp')
  assert.equal(blogImageUrl(scoped, { preset: 'full' }), 'https://img.guanyan.me/webp/v2/full/3840/center/blog/obsidian/2026/10/photo.webp')
  assert.equal(blogImageUrl(scoped, { preset: 'square', width: 640 }), 'https://img.guanyan.me/webp/v2/square/640/top/blog/obsidian/2026/10/photo.webp')
  assert.equal(blogImageUrl(scoped, { preset: 'square', width: 640, focus: 'face' }), 'https://img.guanyan.me/webp/v2/square/640/face/blog/obsidian/2026/10/photo.webp')
  assert.equal(blogImageUrl(scoped, { preset: 'landscape', width: 640 }), 'https://img.guanyan.me/webp/v2/landscape/640/top/blog/obsidian/2026/10/photo.webp')
  assert.throws(() => blogImageUrl(legacy, { preset: 'panorama' }), RangeError)
  assert.throws(() => blogImageUrl(legacy, { focus: 'left' }), RangeError)
})

test('crop=off skips cropping and is never forwarded to the output', () => {
  const cropped = `${legacy}?crop=off&focus=face`
  assert.equal(blogImageUrl(cropped, { preset: 'cover' }), 'https://img.guanyan.me/webp/v2/fit/2400/center/blog/obsidian/2026/10/photo.webp')
  assert.equal(blogImageUrl(cropped, { preset: 'full' }), 'https://img.guanyan.me/webp/v2/full/3840/center/blog/obsidian/2026/10/photo.webp')
  assert.doesNotMatch(blogImageUrl(cropped, { preset: 'cover' }), /crop=|imageMogr2|focus=/)
  assert.equal(blogImageCropDisabled(cropped), true)
  assert.equal(blogImageCropDisabled(legacy), false)
  assert.equal(blogImageCropDisabled('https://example.com/photo.webp?crop=off'), false)
})

test('lightbox full variants remove old crops and legacy processing', () => {
  const processed = 'https://img.215320.xyz/webp/blog/obsidian/2026/10/photo.webp?imageMogr2/thumbnail/256x/quality/75/format/webp'
  assert.equal(
    blogImageUrl(processed, { preset: 'full' }),
    'https://img.guanyan.me/webp/v2/full/3840/center/blog/obsidian/2026/10/photo.webp',
  )
  assert.equal(
    blogImageUrl(processed, { preset: 'fit', width: 256 }),
    'https://img.guanyan.me/webp/v2/fit/256/center/blog/obsidian/2026/10/photo.webp',
  )
})

test('leaves external, internal, signed, and unknown-query images untouched', () => {
  for (const source of [
    'https://example.com/photo.webp',
    'https://images.unsplash.com/photo.jpg?w=800',
    '/avatar.png',
    `${legacy}?sign=abc123&expires=9999999999`,
    `${legacy}?imageMogr2/thumbnail/256x/quality/75/format/webp&sign=abc123`,
    `${legacy}?crop=on`,
    `${legacy}?token=abc`,
    `${legacy}?crop=off&crop=off`,
  ]) {
    assert.equal(blogImageUrl(source, { preset: 'full' }), source)
    assert.equal(blogImageInfoUrl(source), source)
  }
})

test('builds the metadata URL for recognized sources only', () => {
  assert.equal(
    blogImageInfoUrl(legacy),
    'https://img.guanyan.me/webp/v2/info/blog/obsidian/2026/10/photo.webp',
  )
  assert.equal(
    blogImageInfoUrl('https://img.guanyan.me/webp/v2/wide/1200/top/blog/obsidian/2026/10/photo.webp'),
    'https://img.guanyan.me/webp/v2/info/blog/obsidian/2026/10/photo.webp',
  )
})

test('re-processing an already-normalized lightbox URL stays on the full variant', () => {
  const full = 'https://img.guanyan.me/webp/v2/full/3840/center/blog/obsidian/2026/10/photo.webp'
  assert.equal(blogImageUrl(full, { preset: 'full' }), full)
  // A thumbnail that reaches the lightbox is upgraded without keeping its crop.
  assert.equal(
    blogImageUrl('https://img.guanyan.me/webp/v2/square/384/top/blog/obsidian/2026/10/photo.webp', { preset: 'full' }),
    full,
  )
})

test('rejects encoded separators and traversal in the key', () => {
  for (const source of [
    'https://img.guanyan.me/webp/blog/obsidian/2026/10/a%2Fb.webp',
    'https://img.guanyan.me/webp/blog/obsidian/2026/%2e%2e/photo.webp',
    'https://img.guanyan.me/webp/blog/obsidian/2026/10/a%5Cb.webp',
    'https://img.guanyan.me/webp/blog/obsidian/2026/10/%zz.webp',
    'https://img.guanyan.me/webp/blog/obsidian/photo.webp?crop=off#fragment',
  ]) assert.equal(blogImageUrl(source, { preset: 'full' }), source, source)
})
