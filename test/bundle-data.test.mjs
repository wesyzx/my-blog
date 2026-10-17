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
