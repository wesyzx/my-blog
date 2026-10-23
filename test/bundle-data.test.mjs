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

test('all three Obsidian sources build without contacting Notion and preserve collection fields', (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'blog-bundle-all-obsidian-'))
  t.after(() => rmSync(cwd, { recursive: true, force: true }))
  mkdirSync(path.join(cwd, 'lib'))
  mkdirSync(path.join(cwd, 'content/obsidian/attachments'), { recursive: true })
  writeFileSync(path.join(cwd, 'content/about.md'), 'About\n')
  writeFileSync(path.join(cwd, 'content/source.json'), JSON.stringify({
    posts: 'obsidian', food: 'obsidian', gallery: 'obsidian',
  }))
  const snapshot = { posts: [], food: [], gallery: [], says: [], about: '' }
  writeFileSync(path.join(cwd, 'lib/data-bundle.ts'), `export const bundleData = ${JSON.stringify(snapshot)};`)
  for (const section of ['posts', 'food', 'gallery']) {
    mkdirSync(path.join(cwd, 'content/obsidian', section))
    writeFileSync(path.join(cwd, 'content/obsidian', section, 'one.md'),
      `---\npublished: true\nslug: ${section}\ntitle: Example\ndate: 2026-10-19\nlng: 121.5\nlat: 29.8\nimages: [https://example.com/photo.jpg]\n---\nBody\n`)
  }
  const output = execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/bundle-data.mjs', import.meta.url))], {
    cwd,
    env: { ...process.env, NOTION_TOKEN: 'deliberately-invalid', CONTENT_STRICT: '1', MEMOS_TOKEN: '', CONTENT_SOURCE: '', MEMOS_STRICT: '' },
    stdio: 'pipe', timeout: 10_000, encoding: 'utf8',
  })
  assert.equal(output.includes('Notion 同步失败'), false)
  const source = readFileSync(path.join(cwd, 'lib/data-bundle.ts'), 'utf8')
  const bundle = JSON.parse(source.split('export const bundleData = ')[1].trim().replace(/;$/, ''))
  assert.deepEqual(['posts', 'food', 'gallery'].map((section) => bundle[section].length), [1, 1, 1])
  assert.equal(bundle.food[0].lng, 121.5)
  assert.equal(bundle.food[0].lat, 29.8)
  assert.equal(bundle.food[0].images[0], 'https://example.com/photo.jpg')
  assert.deepEqual(bundle.gallery[0].images[0], { src: 'https://example.com/photo.jpg', width: 1200, height: 800 })
  assert.equal(bundle.gallery[0].cover, 'https://example.com/photo.jpg')
})

test('Obsidian R2 albums use source metadata and survive a metadata endpoint rollout', (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'blog-bundle-r2-metadata-'))
  t.after(() => rmSync(cwd, { recursive: true, force: true }))
  mkdirSync(path.join(cwd, 'lib'))
  mkdirSync(path.join(cwd, 'content/obsidian/gallery'), { recursive: true })
  mkdirSync(path.join(cwd, 'content/obsidian/posts'), { recursive: true })
  writeFileSync(path.join(cwd, 'content/about.md'), 'About\n')
  writeFileSync(path.join(cwd, 'content/source.json'), JSON.stringify({ posts: 'obsidian', food: 'obsidian', gallery: 'obsidian' }))
  const src = 'https://img.215320.xyz/webp/blog/obsidian/2026/10/photo.webp'
  writeFileSync(path.join(cwd, 'content/obsidian/gallery/one.md'),
    `---\npublished: true\nslug: album\ntitle: Album\ndate: 2026-10-23\nimages: [${src}]\n---\nBody\n`)
  for (const mode of ['info', 'legacy', 'offline']) {
    const gallery = mode === 'offline' ? [{ slug: 'album', images: [{ src, width: 777, height: 999 }] }] : []
    writeFileSync(path.join(cwd, 'lib/data-bundle.ts'), `export const bundleData = ${JSON.stringify({ posts: [], food: [], gallery, says: [], about: '' })};`)
    const probe = path.join(cwd, 'fetch-probe.mjs')
    writeFileSync(probe, `
      import assert from 'node:assert/strict'
      globalThis.fetch = async (url, options = {}) => {
        assert.ok(options.signal)
        if (String(url).includes('/v2/info/')) {
          assert.equal(String(url), 'https://img.guanyan.me/webp/v2/info/blog/obsidian/2026/10/photo.webp')
          return ${mode === 'info' ? "Response.json({ width: 3024, height: 4032 })" : "new Response('Not found', { status: 404 })"}
        }
        assert.equal(String(url), ${JSON.stringify(src)})
        assert.equal(options.headers.Accept, 'image/webp,image/*;q=0.8')
        assert.equal(options.headers.Range, 'bytes=0-65535')
        ${mode === 'offline' ? "throw new Error('offline')" : mode === 'info' ? "assert.fail('metadata should avoid downloading the image')" : `
          const header = Buffer.alloc(32)
          header.write('GIF89a')
          header.writeUInt16LE(600, 6)
          header.writeUInt16LE(900, 8)
          return new Response(header, { status: 206 })
        `}
      }
    `)
    execFileSync(process.execPath, ['--import', probe, fileURLToPath(new URL('../scripts/bundle-data.mjs', import.meta.url))], {
      cwd, env: { ...process.env, NOTION_TOKEN: '', MEMOS_TOKEN: '', CONTENT_SOURCE: '', CONTENT_ALLOW_EMPTY: '1', OBSIDIAN_BLOG_DIR: path.join(cwd, 'content/obsidian') },
      stdio: 'pipe', timeout: 10_000,
    })
    const output = readFileSync(path.join(cwd, 'lib/data-bundle.ts'), 'utf8')
    const bundle = JSON.parse(output.split('export const bundleData = ')[1].trim().replace(/;$/, ''))
    assert.deepEqual(bundle.gallery[0].images[0], {
      src, ...(mode === 'info' ? { width: 3024, height: 4032 } : mode === 'legacy' ? { width: 600, height: 900 } : { width: 777, height: 999 }),
    }, mode)
  }
})
