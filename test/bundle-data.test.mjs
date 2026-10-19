import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

test('the content builder preserves snapshots on source failure and reads the local about page', (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'blog-bundle-test-'))
  t.after(() => rmSync(cwd, { recursive: true, force: true }))
  mkdirSync(path.join(cwd, 'lib'))
  mkdirSync(path.join(cwd, 'content'))
  const existing = {
    posts: [{ slug: 'saved-post' }],
    food: [],
    gallery: [],
    says: [{ slug: 'saved-note', content: 'Saved note' }],
    about: 'Old about',
  }
  writeFileSync(path.join(cwd, 'lib/data-bundle.ts'), `export const bundleData = ${JSON.stringify(existing)};`)
  writeFileSync(path.join(cwd, 'content/about.md'), 'Local about\n')

  execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/bundle-data.mjs', import.meta.url))], {
    cwd,
    env: { ...process.env, NOTION_TOKEN: '', MEMOS_TOKEN: '', CONTENT_STRICT: '', MEMOS_STRICT: '' },
    stdio: 'pipe',
    timeout: 10_000,
  })
  const output = readFileSync(path.join(cwd, 'lib/data-bundle.ts'), 'utf8')
  const bundle = JSON.parse(output.split('export const bundleData = ')[1].trim().replace(/;$/, ''))
  for (const key of ['posts', 'food', 'gallery', 'says']) assert.deepEqual(bundle[key], existing[key])
  assert.equal(bundle.about, 'Local about\n')
  assert.ok(Number.isFinite(Date.parse(bundle.updatedAt)))
})

test('the content builder falls back to the food and gallery snapshot when Notion is unavailable in Obsidian mode', (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'blog-bundle-obsidian-test-'))
  t.after(() => rmSync(cwd, { recursive: true, force: true }))
  mkdirSync(path.join(cwd, 'lib'))
  mkdirSync(path.join(cwd, 'content'))
  mkdirSync(path.join(cwd, 'obsidian', 'posts'), { recursive: true })
  mkdirSync(path.join(cwd, 'obsidian', 'attachments'), { recursive: true })
  const existing = {
    posts: [{ slug: 'notion-post' }],
    food: [{ slug: 'saved-food' }],
    gallery: [{ slug: 'saved-gallery' }],
    says: [],
    about: 'Old about',
  }
  writeFileSync(path.join(cwd, 'lib/data-bundle.ts'), `export const bundleData = ${JSON.stringify(existing)};`)
  writeFileSync(path.join(cwd, 'content/about.md'), 'Local about\n')
  writeFileSync(path.join(cwd, 'obsidian/posts/first.md'), [
    '---',
    'published: true',
    'slug: first',
    'title: First',
    'date: 2026-10-19',
    'category: 技术',
    'tags: [Obsidian]',
    '---',
    '',
    'Hello',
  ].join('\n'))

  execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/bundle-data.mjs', import.meta.url))], {
    cwd,
    env: {
      ...process.env,
      CONTENT_SOURCE: 'obsidian',
      OBSIDIAN_BLOG_DIR: path.join(cwd, 'obsidian'),
      NOTION_TOKEN: '',
      MEMOS_TOKEN: '',
      CONTENT_STRICT: '',
      MEMOS_STRICT: '',
    },
    stdio: 'pipe',
    timeout: 10_000,
  })
  const output = readFileSync(path.join(cwd, 'lib/data-bundle.ts'), 'utf8')
  const bundle = JSON.parse(output.split('export const bundleData = ')[1].trim().replace(/;$/, ''))
  assert.equal(bundle.posts.length, 1)
  assert.equal(bundle.posts[0].slug, 'first')
  assert.equal(bundle.posts[0].content, 'Hello')
  assert.deepEqual(bundle.food, existing.food)
  assert.deepEqual(bundle.gallery, existing.gallery)
})

test('the Obsidian source refuses to erase existing posts unless explicitly allowed', (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'blog-bundle-obsidian-empty-test-'))
  t.after(() => rmSync(cwd, { recursive: true, force: true }))
  mkdirSync(path.join(cwd, 'lib'))
  mkdirSync(path.join(cwd, 'content'))
  mkdirSync(path.join(cwd, 'obsidian', 'posts'), { recursive: true })
  writeFileSync(
    path.join(cwd, 'lib/data-bundle.ts'),
    `export const bundleData = ${JSON.stringify({ posts: [{ slug: 'saved' }], food: [], gallery: [], says: [], about: '' })};`,
  )
  writeFileSync(path.join(cwd, 'content/about.md'), 'About\n')
  assert.throws(() => execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/bundle-data.mjs', import.meta.url))], {
    cwd,
    env: {
      ...process.env,
      CONTENT_SOURCE: 'obsidian',
      OBSIDIAN_BLOG_DIR: path.join(cwd, 'obsidian'),
      CONTENT_ALLOW_EMPTY: '',
      NOTION_TOKEN: '',
      MEMOS_TOKEN: '',
    },
    stdio: 'pipe',
    timeout: 10_000,
  }), /没有已发布文章/)
})
