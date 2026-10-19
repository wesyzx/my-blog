import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { copyPublishedAttachments, loadObsidianPosts, mirrorPublishedAttachments, parseBundle, serializeBundle } from '../lib/obsidian-content.mjs'

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
    sourceFiles: new Map([['published', path.join(root, 'posts', 'published.md')]]),
  })
  assert.deepEqual(copies, ['attachments/trip/photo one.jpg'])
  assert.equal(readFileSync(path.join(destination, 'attachments/trip/photo one.jpg'), 'utf8'), 'image')
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
