import assert from 'node:assert/strict'
import test from 'node:test'
import { localAttachmentTargets, readOnlyFetch, resolveAttachment, safeBlogPath } from '../ops/obsidian-publisher/read-policy.mjs'

test('remote transport rejects every database write and credentials cannot follow redirects', async () => {
  const calls = []
  const counts = { reads: 0, blocked: 0 }
  const fetch = readOnlyFetch('https://sync.example/notes', counts, async (url, options) => {
    calls.push({ url, options })
    return new Response('{}')
  })
  for (const [method, suffix] of [['PUT', '/x'], ['POST', '/_bulk_docs'], ['DELETE', '/x'], ['POST', '/_security']]) {
    await assert.rejects(fetch(`https://sync.example/notes${suffix}`, { method }), /blocked/)
  }
  await assert.rejects(fetch('https://other.example/notes'), /blocked/)
  await assert.rejects(fetch('https://sync.example/notes-other'), /blocked/)
  await fetch('https://sync.example/notes/x', { method: 'GET' })
  await fetch('https://sync.example/notes/_all_docs', { method: 'POST', body: '{"keys":[]}' })
  assert.equal(calls.length, 2)
  assert.ok(calls.every(({ options }) => options.redirect === 'error'))
  assert.deepEqual(counts, { reads: 2, blocked: 6 })
})

test('only normalized Blog paths and attachments within its attachment directory are eligible', () => {
  for (const value of ['私人/a.md', '../Blog/a.md', 'Blog/../secret.md', 'Blog/a/../secret.md', 'Blog\\a.md']) {
    assert.equal(safeBlogPath(value), null)
  }
  assert.equal(safeBlogPath('Blog/posts/文章.md'), 'Blog/posts/文章.md')
  const metadata = new Map([['Blog/attachments/图片 1.jpg', {}], ['私人/password.txt', {}], ['Blog/posts/private.md', {}]])
  assert.equal(resolveAttachment('../attachments/图片 1.jpg', 'Blog/posts/test.md', metadata), 'Blog/attachments/图片 1.jpg')
  assert.throws(() => resolveAttachment('../../私人/password.txt', 'Blog/posts/test.md', metadata), /outside/)
  assert.throws(() => resolveAttachment('private.md', 'Blog/posts/test.md', metadata), /outside/)
})

test('collects Unicode, spaced and encoded attachment paths from published content', () => {
  assert.deepEqual(localAttachmentTargets([
    '![[../attachments/图片 1.jpg|200]]',
    '![a](<../attachments/图片 1.jpg>)',
    '![b](../attachments/another%20one.png)',
    '![c](https://example/photo.jpg)',
  ].join('\n'), { cover: 'attachments/cover.jpg' }), [
    '../attachments/图片 1.jpg', '../attachments/another one.png', 'attachments/cover.jpg',
  ])
})
