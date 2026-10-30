import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const publisher = process.env.PUBLISHER_TEST_SCRIPT || fileURLToPath(new URL('../scripts/obsidian-publish.mjs', import.meta.url))

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'blog-publisher-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const repo = path.join(root, 'repository')
  const source = path.join(root, 'Blog')
  const remote = path.join(root, 'remote.git')
  mkdirSync(repo)
  mkdirSync(path.join(source, 'posts'), { recursive: true })
  mkdirSync(path.join(source, 'attachments'), { recursive: true })
  const git = (args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: 'pipe' }).trim()
  git(['init', '-b', 'main'])
  git(['config', 'user.name', 'Publisher test'])
  git(['config', 'user.email', 'test@example.invalid'])
  writeFileSync(path.join(repo, '.gitignore'), '.tmp/\n')
  git(['add', '.gitignore'])
  git(['commit', '-m', 'initial'])
  git(['init', '--bare', remote])
  git(['remote', 'add', 'origin', remote])
  git(['push', '-u', 'origin', 'main'])
  writeFileSync(path.join(source, 'posts/文章.md'), '---\npublished: true\ntitle: Test\nslug: test\ndate: 2026-10-19\n---\n![[../attachments/图片 1.jpg]]\n')
  writeFileSync(path.join(source, 'posts/草稿.md'), '---\npublished: false\n---\nPRIVATE DRAFT')
  writeFileSync(path.join(source, 'attachments/图片 1.jpg'), 'approved image')
  writeFileSync(path.join(source, 'attachments/private.txt'), 'PRIVATE ATTACHMENT')
  const publish = (...args) => execFileSync(process.execPath, [publisher, ...args], {
    encoding: 'utf8', stdio: 'pipe', timeout: 10_000,
    env: { ...process.env, OBSIDIAN_BLOG_DIR: source, OBSIDIAN_PUBLISH_REPO: repo,
      OBSIDIAN_PUBLISH_RESULT_FILE: path.join(repo, '.tmp/publication-result.json') },
  })
  return { root, repo, source, remote, git, publish }
}

test('publisher commits and pushes only approved Unicode articles and referenced attachments', async (t) => {
  const f = fixture(t)
  f.publish()
  assert.equal(f.git(['status', '--porcelain']), '')
  assert.equal(f.git(['rev-parse', 'HEAD']), f.git(['rev-parse', 'origin/main']))
  assert.equal(f.git(['ls-tree', '-r', '--name-only', '-z', 'HEAD', 'content/obsidian']).split('\0').filter(Boolean).length, 2)
  assert.equal(readFileSync(path.join(f.repo, 'content/obsidian/posts/文章.md'), 'utf8').includes('PRIVATE'), false)
  assert.equal(readFileSync(path.join(f.repo, 'content/obsidian/attachments/图片 1.jpg'), 'utf8'), 'approved image')
  const commit = f.git(['rev-parse', 'HEAD'])
  f.publish()
  assert.equal(f.git(['rev-parse', 'HEAD']), commit)
})

test('dry run never pushes a pending publication; the next normal run retries it', (t) => {
  const f = fixture(t)
  f.publish('--no-push')
  assert.notEqual(f.git(['rev-parse', 'HEAD']), f.git(['rev-parse', 'origin/main']))
  const remote = f.git(['rev-parse', 'origin/main'])
  f.publish('--dry-run')
  assert.equal(f.git(['rev-parse', 'origin/main']), remote)
  f.publish()
  assert.equal(f.git(['rev-parse', 'HEAD']), f.git(['rev-parse', 'origin/main']))
})

test('invalid current content never pushes a previously pending publication', (t) => {
  const f = fixture(t)
  f.publish('--no-push')
  const remote = f.git(['rev-parse', 'origin/main'])
  writeFileSync(path.join(f.source, 'posts/文章.md'),
    '---\npublished: true\ntitle: Invalid\ndate: 2026-10-19\n---\n![[missing.jpg]]\n')
  assert.throws(() => f.publish(), /找不到附件/)
  assert.equal(f.git(['rev-parse', 'origin/main']), remote)
})

test('publisher rejects unrelated staged changes, wrong branches, and unrelated pending commits', (t) => {
  const f = fixture(t)
  writeFileSync(path.join(f.repo, 'private.txt'), 'not for publication')
  f.git(['add', 'private.txt'])
  assert.throws(() => f.publish(), /other repository files are dirty/)
  f.git(['commit', '-m', 'unrelated work'])
  assert.throws(() => f.publish(), /other repository files are dirty/)
  f.git(['push', 'origin', 'main'])
  f.git(['switch', '-c', 'other'])
  assert.throws(() => f.publish(), /requires the main branch/)
})

test('an empty section retains its public copy while other sections continue updating', (t) => {
  const f = fixture(t)
  writeFileSync(path.join(f.source, 'attachments/gallery-only.jpg'), 'retained gallery image')
  for (const section of ['food', 'gallery']) {
    mkdirSync(path.join(f.source, section))
    writeFileSync(path.join(f.source, section, '文章.md'),
      `---\npublished: true\ntitle: Collection\nslug: collection\ndate: 2026-10-19\nimages: [../attachments/${section === 'gallery' ? 'gallery-only.jpg' : '图片 1.jpg'}]\n---\n`)
    writeFileSync(path.join(f.source, section, '草稿.md'), '---\npublished: false\n---\nPRIVATE')
  }
  f.publish()
  const files = f.git(['ls-tree', '-r', '--name-only', '-z', 'HEAD', 'content/obsidian']).split('\0').filter(Boolean)
  assert.equal(files.length, 5)
  for (const section of ['posts', 'food', 'gallery']) {
    assert.equal(readFileSync(path.join(f.repo, 'content/obsidian', section, '文章.md'), 'utf8').includes('PRIVATE'), false)
  }
  writeFileSync(path.join(f.source, 'posts/文章.md'),
    '---\npublished: true\ntitle: Updated\nslug: test\ndate: 2026-10-30\n---\nUpdated post\n')
  rmSync(path.join(f.source, 'gallery/文章.md'))
  rmSync(path.join(f.source, 'attachments/gallery-only.jpg'))
  f.publish()
  assert.match(readFileSync(path.join(f.repo, 'content/obsidian/posts/文章.md'), 'utf8'), /Updated post/)
  assert.ok(readFileSync(path.join(f.repo, 'content/obsidian/gallery/文章.md'), 'utf8').includes('Collection'))
  assert.equal(readFileSync(path.join(f.repo, 'content/obsidian/attachments/图片 1.jpg'), 'utf8'), 'approved image')
  assert.equal(readFileSync(path.join(f.repo, 'content/obsidian/attachments/gallery-only.jpg'), 'utf8'), 'retained gallery image')
  const report = JSON.parse(readFileSync(path.join(f.repo, '.tmp/publication-result.json')))
  assert.deepEqual(report.held_sections, ['gallery'])
  assert.deepEqual(report.effective_counts, { posts: 1, food: 1, gallery: 1 })
  assert.equal(f.git(['status', '--porcelain']), '')
})

function developerClone(f) {
  const other = path.join(f.root, 'developer')
  execFileSync('git', ['clone', '--branch', 'main', f.remote, other], { stdio: 'pipe' })
  const git = (args) => execFileSync('git', ['-C', other, ...args], { encoding: 'utf8', stdio: 'pipe' }).trim()
  git(['config', 'user.name', 'Developer'])
  git(['config', 'user.email', 'developer@example.invalid'])
  return { other, git }
}

test('pending publisher commits recover across an independent remote code update', (t) => {
  const f = fixture(t)
  f.publish('--no-push')
  const developer = developerClone(f)
  writeFileSync(path.join(developer.other, 'site.txt'), 'independent code')
  developer.git(['add', '.'])
  developer.git(['commit', '-m', 'site update'])
  developer.git(['push', 'origin', 'main'])
  f.publish()
  assert.equal(f.git(['rev-parse', 'HEAD']), f.git(['rev-parse', 'origin/main']))
  assert.equal(readFileSync(path.join(f.repo, 'site.txt'), 'utf8'), 'independent code')
  assert.ok(readFileSync(path.join(f.repo, 'content/obsidian/posts/文章.md'), 'utf8').includes('Test'))
})

test('a code push racing with publication is fetched, safely replayed, and retried', (t) => {
  const f = fixture(t)
  const developer = developerClone(f)
  writeFileSync(path.join(developer.other, 'site.txt'), 'racing code')
  developer.git(['add', '.'])
  developer.git(['commit', '-m', 'racing update'])
  const hook = path.join(f.repo, '.git/hooks/pre-push')
  writeFileSync(hook, `#!/bin/sh\nrm "$0"\ngit --git-dir='${developer.other}/.git' --work-tree='${developer.other}' push origin main\n`, { mode: 0o755 })
  f.publish()
  assert.equal(f.git(['rev-parse', 'HEAD']), f.git(['rev-parse', 'origin/main']))
  assert.equal(readFileSync(path.join(f.repo, 'site.txt'), 'utf8'), 'racing code')
})

test('remote publication edits are never automatically reconciled', (t) => {
  const f = fixture(t)
  f.publish()
  const developer = developerClone(f)
  writeFileSync(path.join(f.source, 'posts/文章.md'),
    '---\npublished: true\ntitle: Local\nslug: test\ndate: 2026-10-30\n---\nLocal\n')
  f.publish('--no-push')
  const before = f.git(['rev-parse', 'HEAD'])
  writeFileSync(path.join(developer.other, 'content/obsidian/posts/文章.md'), 'remote content')
  developer.git(['add', '.'])
  developer.git(['commit', '-m', 'manual content edit'])
  developer.git(['push', 'origin', 'main'])
  assert.throws(() => f.publish(), /diverged/)
  assert.equal(f.git(['rev-parse', 'HEAD']), before)
  assert.equal(f.git(['status', '--porcelain']), '')
})

test('unknown pending content commits and an entirely empty source remain protected', (t) => {
  const f = fixture(t)
  f.publish()
  rmSync(path.join(f.source, 'posts/文章.md'))
  assert.throws(() => f.publish(), /no published content/)
  writeFileSync(path.join(f.source, 'posts/文章.md'),
    '---\npublished: true\ntitle: Test\nslug: test\ndate: 2026-10-19\n---\nOriginal\n')
  const developer = developerClone(f)
  writeFileSync(path.join(f.repo, 'content/obsidian/posts/文章.md'), 'unknown pending content')
  f.git(['add', '.'])
  f.git(['commit', '-m', 'manual content update'])
  const before = f.git(['rev-parse', 'HEAD'])
  writeFileSync(path.join(developer.other, 'site.txt'), 'independent site code')
  developer.git(['add', '.'])
  developer.git(['commit', '-m', 'site update'])
  developer.git(['push', 'origin', 'main'])
  assert.throws(() => f.publish(), /diverged/)
  assert.equal(f.git(['rev-parse', 'HEAD']), before)
})

test('retained attachments cannot be silently overwritten by newer sections', (t) => {
  const f = fixture(t)
  mkdirSync(path.join(f.source, 'gallery'))
  writeFileSync(path.join(f.source, 'gallery/old.md'),
    '---\npublished: true\ntitle: Old\nslug: old\ndate: 2026-10-19\n---\n![[../attachments/图片 1.jpg]]\n')
  f.publish()
  rmSync(path.join(f.source, 'gallery/old.md'))
  writeFileSync(path.join(f.source, 'attachments/图片 1.jpg'), 'new different image')
  const before = f.git(['rev-parse', 'HEAD'])
  assert.throws(() => f.publish(), /retained attachment conflicts/)
  assert.equal(f.git(['rev-parse', 'HEAD']), before)
})
