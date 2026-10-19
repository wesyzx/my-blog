import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { copyPublishedAttachments, loadObsidianContent, loadObsidianPosts, mirrorPublishedAttachments, parseBundle, serializeBundle } from '../lib/obsidian-content.mjs'

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'obsidian-blog-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(path.join(root, 'posts'), { recursive: true })
  mkdirSync(path.join(root, 'attachments', 'trip'), { recursive: true })
  writeFileSync(path.join(root, 'attachments', 'not-used.jpg'), 'unused')
  writeFileSync(path.join(root, 'attachments', 'trip', 'photo one.jpg'), 'image')
  return root
}

function writePost(root, filename, frontmatter, body = '') {
  writeFileSync(path.join(root, 'posts', filename), `---\n${frontmatter.trim()}\n---\n${body}`)
}

test('loads only published posts, validates frontmatter and sorts by date', async (t) => {
  const root = fixture(t)
  writePost(root, 'first.md', `
published: true
slug: first-post
title: 第一篇
date: 2026-10-18
category: 技术
tags:
  - Obsidian
  - Blog
excerpt: 摘要
`, '正文')
  writePost(root, 'later.md', `
published: true
title: 第二篇
date: 2026-10-19
`)
  writePost(root, 'draft.md', `
published: false
title: 草稿
date: 2026-10-20
`)

  const posts = await loadObsidianPosts({ blogRoot: root })
  assert.deepEqual(posts.map((post) => post.slug), ['later', 'first-post'])
  assert.equal(posts[1].category, '技术')
  assert.deepEqual(posts[1].tags, ['Obsidian', 'Blog'])
  assert.equal(posts[0].category, '未分类')
  assert.equal(posts[1].content, '正文')
})

test('ignores incomplete drafts without reserving their titles or slugs', async (t) => {
  const root = fixture(t)
  writePost(root, 'draft.md', 'published: false\nslug: same')
  writePost(root, 'published.md', 'published: true\nslug: same\ntitle: 已发布\ndate: 2026-10-19')
  const posts = await loadObsidianPosts({ blogRoot: root })
  assert.deepEqual(posts.map((post) => post.slug), ['same'])
})

test('accepts the date and time format produced by the Obsidian template', async (t) => {
  const root = fixture(t)
  writePost(root, 'dated.md', `
published: true
slug: dated
title: 带时间
date: 2026-10-19T09:30:00+08:00
`)
  const [post] = await loadObsidianPosts({ blogRoot: root })
  assert.equal(post.date, '2026-10-19')
})

test('resolves duplicate slugs deterministically', async (t) => {
  const root = fixture(t)
  writePost(root, 'one.md', 'published: true\nslug: same\ntitle: 一\ndate: 2026-10-18')
  writePost(root, 'two.md', 'published: true\nslug: same\ntitle: 二\ndate: 2026-10-17')
  const posts = await loadObsidianPosts({ blogRoot: root })
  assert.deepEqual(posts.map((post) => post.slug).sort(), ['same', 'same-2'])
})

test('converts Obsidian embeds and links while preserving external images', async (t) => {
  const root = fixture(t)
  writePost(root, 'travel.md', `
published: true
slug: travel
title: 旅行
date: 2026-10-18
cover: attachments/trip/photo one.jpg
`, [
    '![[attachments/trip/photo one.jpg|封面]]',
    '![本地](attachments/trip/photo one.jpg)',
    '![远程](https://images.example/remote.jpg)',
    '[[目标文章|另一篇]]',
  ].join('\n\n'))
  writePost(root, 'target.md', 'published: false\nslug: target\ntitle: 目标文章\ndate: 2026-10-17')

  const [post] = await loadObsidianPosts({
    blogRoot: root,
    attachmentBaseUrl: 'https://cdn.example/blog',
  })
  assert.equal(post.cover, 'https://cdn.example/blog/attachments/trip/photo%20one.jpg')
  assert.match(post.content, /!\[封面\]\(https:\/\/cdn\.example\/blog\/attachments\/trip\/photo%20one\.jpg\)/)
  assert.match(post.content, /!\[本地\]\(https:\/\/cdn\.example\/blog\/attachments\/trip\/photo%20one\.jpg\)/)
  assert.match(post.content, /!\[远程\]\(https:\/\/images\.example\/remote\.jpg\)/)
  assert.match(post.content, /\[另一篇\]\(\/posts\/target\)/)
})

test('rejects missing frontmatter, invalid dates and unpublished attachments', async (t) => {
  const root = fixture(t)
  writePost(root, 'bad-date.md', 'published: true\ntitle: Bad\ndate: 2026-02-30')
  await assert.rejects(loadObsidianPosts({ blogRoot: root }), /date 必须是 YYYY-MM-DD/)

  rmSync(path.join(root, 'posts', 'bad-date.md'))
  writeFileSync(path.join(root, 'posts', 'plain.md'), '# no frontmatter')
  await assert.rejects(loadObsidianPosts({ blogRoot: root }), /缺少 YAML frontmatter/)

  rmSync(path.join(root, 'posts', 'plain.md'))
  writePost(root, 'asset.md', 'published: true\ntitle: Asset\ndate: 2026-10-18', '![[attachments/trip/photo one.jpg]]')
  await assert.rejects(loadObsidianPosts({ blogRoot: root }), /需要设置 attachmentBaseUrl/)
})

test('rejects attachments outside the publish area', async (t) => {
  const root = fixture(t)
  writeFileSync(path.join(root, '..', 'private.txt'), 'private')
  writePost(root, 'escape.md', 'published: true\ntitle: Escape\ndate: 2026-10-18', '![[../private.txt]]')
  await assert.rejects(
    loadObsidianPosts({ blogRoot: root, attachmentBaseUrl: 'https://cdn.example' }),
    /不在 Blog 发布区内/,
  )
})

test('serializes bundles without evaluating TypeScript', () => {
  const bundle = { posts: [{ slug: 'one', title: 'One' }], food: [] }
  assert.deepEqual(parseBundle(serializeBundle(bundle)), bundle)
})

test('copies only attachments referenced by published posts', async (t) => {
  const root = fixture(t)
  writePost(root, 'published.md', 'published: true\nslug: published\ntitle: 已发布\ndate: 2026-10-19', [
    '![[attachments/trip/photo one.jpg]]',
  ].join('\n'))
  writePost(root, 'draft.md', 'published: false\nslug: draft\ntitle: 草稿\ndate: 2026-10-18', '![[attachments/trip/photo one.jpg]]')
  const posts = await loadObsidianPosts({ blogRoot: root, attachmentBaseUrl: '/obsidian' })
  const destination = path.join(root, 'public')
  const copies = await copyPublishedAttachments({
    blogRoot: root,
    posts,
    destinationRoot: destination,
  })
  assert.deepEqual(copies, ['attachments/trip/photo one.jpg'])
  assert.equal(readFileSync(path.join(destination, 'attachments/trip/photo one.jpg'), 'utf8'), 'image')
})

test('titled drafts cannot change published slugs or override their wiki links', async (t) => {
  const root = fixture(t)
  writePost(root, 'a-draft.md', 'published: false\nslug: same\ntitle: Article')
  writePost(root, 'b-published.md', 'published: true\nslug: same\ntitle: Article\ndate: 2026-10-19', '[[Article]]')
  writePost(root, 'z-draft.md', 'published: false\nslug: private\ntitle: Article')
  const [post] = await loadObsidianPosts({ blogRoot: root })
  assert.equal(post.slug, 'same')
  assert.equal(post.content, '[Article](/posts/same)')
})

test('only attachments may be mirrored even when other files are inside Blog', async (t) => {
  const root = fixture(t)
  writePost(root, 'private.md', 'published: false\ntitle: Private', 'DO NOT PUBLISH')
  symlinkSync(path.join(root, 'posts/private.md'), path.join(root, 'attachments/private.md'))
  writePost(root, 'public.md', 'published: true\ntitle: Public\ndate: 2026-10-19', '![[private.md]]')
  await assert.rejects(loadObsidianContent({ blogRoot: root }), /不在 Blog 发布区内/)
  rmSync(path.join(root, 'attachments/private.md'))
  await assert.rejects(loadObsidianContent({ blogRoot: root }), /找不到附件/)
})

test('literal percent signs and encoded links refer to the same attachment in every stage', async (t) => {
  const root = fixture(t)
  writeFileSync(path.join(root, 'attachments/100% image.jpg'), 'image')
  writePost(root, 'public.md', 'published: true\ntitle: Public\ndate: 2026-10-19', [
    '![[attachments/100% image.jpg]]',
    '![photo](attachments/100%25%20image.jpg)',
  ].join('\n'))
  const content = await loadObsidianContent({ blogRoot: root })
  assert.equal((content.posts[0].content.match(/100%25%20image.jpg/g) || []).length, 2)
  assert.deepEqual(await mirrorPublishedAttachments({
    blogRoot: root, posts: content.posts, destinationRoot: path.join(root, 'public'),
  }), ['attachments/100% image.jpg'])
})

test('literal percent signs are valid attachment names across content, cover and mirror stages', async (t) => {
  const root = fixture(t)
  writeFileSync(path.join(root, 'attachments/100% image.jpg'), 'image')
  writePost(root, 'public.md', [
    'published: true',
    'title: Public',
    'date: 2026-10-19',
    'cover: attachments/100% image.jpg',
  ].join('\n'), '![photo](attachments/100% image.jpg)')

  const content = await loadObsidianContent({ blogRoot: root })
  assert.equal(content.posts[0].cover, '/obsidian/attachments/100%25%20image.jpg')
  assert.match(content.posts[0].content, /!\[photo\]\(\/obsidian\/attachments\/100%25%20image\.jpg\)/)
  assert.deepEqual(await mirrorPublishedAttachments({
    blogRoot: root, posts: content.posts, destinationRoot: path.join(root, 'public'),
  }), ['attachments/100% image.jpg'])
})

test('malformed percent escapes remain an ordinary missing-attachment error', async (t) => {
  const root = fixture(t)
  writePost(root, 'public.md', 'published: true\ntitle: Public\ndate: 2026-10-19', '![photo](attachments/%E0%A4%A.jpg)')
  await assert.rejects(loadObsidianPosts({ blogRoot: root, attachmentBaseUrl: '/obsidian' }), /找不到附件/)
})

test('percent-encoded filenames are decoded once across links, metadata and gallery sizing', async (t) => {
  const root = fixture(t)
  mkdirSync(path.join(root, 'gallery'))
  writeFileSync(path.join(root, 'attachments/literal%20name.jpg'), 'image')
  const frontmatter = [
    'published: true', 'title: Public', 'date: 2026-10-19',
    'cover: attachments/literal%2520name.jpg',
    'images: [attachments/literal%2520name.jpg]',
  ].join('\n')
  const body = [
    '![[attachments/literal%20name.jpg]]',
    '![photo](attachments/literal%2520name.jpg)',
  ].join('\n')
  writePost(root, 'public.md', frontmatter, body)
  writeFileSync(path.join(root, 'gallery/album.md'), `---\n${frontmatter}\n---\n${body}`)
  const content = await loadObsidianContent({ blogRoot: root })
  assert.equal(content.posts[0].cover, '/obsidian/attachments/literal%2520name.jpg')
  assert.equal((content.posts[0].content.match(/literal%2520name.jpg/g) || []).length, 2)
  assert.equal(content.gallery[0].images[0].src, '/obsidian/attachments/literal%2520name.jpg')
  assert.deepEqual(await mirrorPublishedAttachments({
    blogRoot: root, posts: [...content.posts, ...content.gallery], destinationRoot: path.join(root, 'public'),
  }), ['attachments/literal%20name.jpg'])
})

test('encoded cover and image-list metadata resolve the same attachment on disk', async (t) => {
  const root = fixture(t)
  writeFileSync(path.join(root, 'attachments/photo one.jpg'), 'image')
  writePost(root, 'public.md', [
    'published: true',
    'title: Public',
    'date: 2026-10-19',
    'cover: attachments/photo%20one.jpg',
    'images: [attachments/photo%20one.jpg]',
  ].join('\n'))
  const content = await loadObsidianContent({ blogRoot: root })
  assert.equal(content.posts[0].cover, '/obsidian/attachments/photo%20one.jpg')
  assert.deepEqual(await mirrorPublishedAttachments({
    blogRoot: root, posts: content.posts, destinationRoot: path.join(root, 'public'),
  }), ['attachments/photo one.jpg'])
})

test('mirrors attachments and removes copies no longer referenced', async (t) => {
  const root = fixture(t)
  writePost(root, 'published.md', 'published: true\nslug: published\ntitle: 已发布\ndate: 2026-10-19', '![[attachments/trip/photo one.jpg]]')
  const destination = path.join(root, 'public')
  mkdirSync(path.join(destination, 'attachments'), { recursive: true })
  writeFileSync(path.join(destination, 'attachments', 'stale.jpg'), 'stale')
  const posts = await loadObsidianPosts({ blogRoot: root, attachmentBaseUrl: '/obsidian' })
  await mirrorPublishedAttachments({ blogRoot: root, posts, destinationRoot: destination })
  assert.equal(readFileSync(path.join(destination, 'attachments/trip/photo one.jpg'), 'utf8'), 'image')
  assert.equal(existsSync(path.join(destination, 'attachments/stale.jpg')), false)
})

test('encoded and angle-bracket attachment links are both rewritten and copied', async (t) => {
  const root = fixture(t)
  writePost(root, 'post.md', 'published: true\ntitle: Post\ndate: 2026-10-19', [
    '![a](<../attachments/trip/photo one.jpg>)',
    '![b](../attachments/trip/photo%20one.jpg)',
  ].join('\n'))
  const posts = await loadObsidianPosts({ blogRoot: root, attachmentBaseUrl: '/obsidian' })
  assert.equal((posts[0].content.match(/\/obsidian\/attachments\/trip\/photo%20one.jpg/g) || []).length, 2)
  const destination = path.join(root, 'public')
  const copied = await mirrorPublishedAttachments({ blogRoot: root, posts, destinationRoot: destination })
  assert.deepEqual(copied, ['attachments/trip/photo one.jpg'])
})

test('rejects an attachment symlink pointing outside Blog', async (t) => {
  const root = fixture(t)
  const privateRoot = mkdtempSync(path.join(tmpdir(), 'private-note-'))
  t.after(() => rmSync(privateRoot, { recursive: true, force: true }))
  writeFileSync(path.join(privateRoot, 'secret.txt'), 'PRIVATE')
  symlinkSync(path.join(privateRoot, 'secret.txt'), path.join(root, 'attachments/escape.txt'))
  writePost(root, 'post.md', 'published: true\ntitle: Post\ndate: 2026-10-19', '![[attachments/escape.txt]]')
  await assert.rejects(loadObsidianPosts({ blogRoot: root, attachmentBaseUrl: '/obsidian' }), /不在 Blog 发布区内/)
})

test('food and gallery retain their metadata, share attachments, and use their own routes', async (t) => {
  const root = fixture(t)
  writePost(root, 'first.md', 'published: true\ntitle: Post\ndate: 2026-10-19')
  for (const section of ['food', 'gallery']) mkdirSync(path.join(root, section))
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1yQAAAAASUVORK5CYII=', 'base64')
  writeFileSync(path.join(root, 'attachments/photo.png'), png)
  writeFileSync(path.join(root, 'food/first.md'), `---
published: true
title: Restaurant
date: 2026-10-19
location: Shop
address: Road
lng: 121.5
lat: 29.8
tags: [dinner]
images: [../attachments/photo.png]
---
[[Restaurant|Self]]
`)
  writeFileSync(path.join(root, 'gallery/first.md'), `---
published: true
title: Album
date: 2026-10-19
images:
  - src: ../attachments/photo.png
    width: 1200
    height: 800
  - src: https://example.com/photo.jpg
    width: 640
    height: 480
---
![[../attachments/photo.png]]
[[Album|Self]]
`)
  writeFileSync(path.join(root, 'gallery/draft.md'), '---\npublished: false\n---\n![[missing.png]]')
  const content = await loadObsidianContent({ blogRoot: root })
  assert.equal(content.posts.length, 1)
  assert.equal(content.food.length, 1)
  assert.equal(content.gallery.length, 1)
  const [food] = content.food
  assert.deepEqual([food.location, food.address, food.lng, food.lat], ['Shop', 'Road', 121.5, 29.8])
  assert.deepEqual(food.tags, ['dinner'])
  assert.deepEqual(food.images, ['/obsidian/attachments/photo.png'])
  assert.match(food.content, /\[Self\]\(\/food\/first\)/)
  const [album] = content.gallery
  assert.equal(album.category, '日常')
  assert.deepEqual(album.images, [
    { src: '/obsidian/attachments/photo.png', width: 1, height: 1 },
    { src: 'https://example.com/photo.jpg', width: 640, height: 480 },
  ])
  assert.equal(album.cover, '/obsidian/attachments/photo.png')
  assert.match(album.content, /\[Self\]\(\/gallery\/first\)/)
  assert.deepEqual(await mirrorPublishedAttachments({
    blogRoot: root, posts: Object.values(content).flat(), destinationRoot: path.join(root, 'public'),
  }), ['attachments/photo.png'])
})

test('collection image lists cannot expose private files and invalid food coordinates are rejected', async (t) => {
  const root = fixture(t)
  mkdirSync(path.join(root, 'food'))
  writeFileSync(path.join(root, 'food/test.md'), '---\npublished: true\ntitle: Food\ndate: 2026-10-19\nlng: 181\nlat: 20\n---\n')
  await assert.rejects(loadObsidianContent({ blogRoot: root }), /坐标超出/)
  writeFileSync(path.join(root, 'food/test.md'), '---\npublished: true\ntitle: Food\ndate: 2026-10-19\nlng: 121\n---\n')
  await assert.rejects(loadObsidianContent({ blogRoot: root }), /同时填写/)
  const privateRoot = mkdtempSync(path.join(tmpdir(), 'private-image-'))
  t.after(() => rmSync(privateRoot, { recursive: true, force: true }))
  writeFileSync(path.join(privateRoot, 'secret.png'), 'PRIVATE')
  symlinkSync(path.join(privateRoot, 'secret.png'), path.join(root, 'attachments/escape.png'))
  writeFileSync(path.join(root, 'food/test.md'), '---\npublished: true\ntitle: Food\ndate: 2026-10-19\nimages: [../attachments/escape.png]\n---\n')
  await assert.rejects(loadObsidianContent({ blogRoot: root }), /不在 Blog 发布区内/)
})
