import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import YAML from 'yaml'
import { loadObsidianContent, copyPublishedAttachments } from '../lib/obsidian-content.mjs'
import { mergeManagedGallery, parseGalleryControl } from '../lib/gallery-control.mjs'

const require = createRequire(import.meta.url)
const model = require('../obsidian/blog-create/gallery-model.js')
const album = {
  id: 'c14efe32-96e6-4fcd-8b55-bee98ab3da77', title: '照片与视频',
  slug: 'family-film', date: '2026-10-31', published: true, category: '日常',
  images: [
    { src: 'https://img.guanyan.me/webp/blog/one.jpg', width: 1200, height: 800 },
    { kind: 'video', src: 'https://img.guanyan.me/webp/video/blog/one.mov',
      width: 1080, height: 1920, duration: 84, poster: 'https://img.guanyan.me/webp/blog/poster.webp', mimeType: 'video/quicktime' },
    { src: 'https://img.guanyan.me/webp/blog/two.jpg', width: 800, height: 1200 },
  ],
}

test('editable notes publish mixed media in body order and removing embeds never restores metadata or cover', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gallery-management-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  await fs.mkdir(path.join(root, 'gallery'))
  const file = path.join(root, 'gallery/family.md')
  const original = model.editableAlbumContent(album)
  await fs.writeFile(file, original)
  const read = async () => (await loadObsidianContent({ blogRoot: root, sections: ['gallery'] })).gallery[0]
  let item = await read()
  assert.equal(item.albumId, album.id)
  assert.deepEqual(item.images.map((media) => media.kind || 'image'), ['image', 'video', 'image'])
  assert.deepEqual(item.images[1], album.images[1])
  const removedPhoto = original.replace(/!\[照片 1\].*\n/, '')
  await fs.writeFile(file, removedPhoto)
  item = await read()
  assert.equal(item.images.length, 2)
  assert.equal(item.cover, album.images[2].src)
  const removedVideo = removedPhoto.replace(/<video.*<\/video>\n/, '')
  await fs.writeFile(file, removedVideo)
  assert.deepEqual((await read()).images.map((media) => media.src), [album.images[2].src])
  await fs.writeFile(file, removedVideo.replace(/!\[照片 3\].*\n/, ''))
  assert.deepEqual((await read()).images, [])
  assert.equal((await read()).cover, '')
})

test('claimed IDs suppress remote fallback for edited, unpublished and deleted albums while new phone uploads remain visible', () => {
  const control = parseGalleryControl(model.controlContent([album.id]))
  const remote = { ...album, albumId: album.id }
  const fresh = { ...remote, albumId: '736bcfe2-c9c9-4a9a-b313-fa9662fb6533', slug: 'fresh' }
  const edited = { ...remote, images: [album.images[1]], source: 'obsidian' }
  assert.deepEqual(mergeManagedGallery([edited], [remote, fresh], control).map((item) => item.slug), ['family-film', 'fresh'])
  assert.deepEqual(mergeManagedGallery([], [remote, fresh], control), [fresh])
  assert.throws(() => parseGalleryControl('---\ntype: blog-gallery-control\nversion: 1\nalbumIds: [broken]\n---\n'), /格式无效/)
})

test('native local video embeds resolve and export only the referenced video attachment', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gallery-local-video-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  await fs.mkdir(path.join(root, 'gallery'))
  await fs.mkdir(path.join(root, 'attachments'))
  await fs.writeFile(path.join(root, 'attachments/片段 one.mp4'), 'fixture video bytes')
  await fs.writeFile(path.join(root, 'attachments/private.mp4'), 'private')
  await fs.writeFile(path.join(root, 'gallery/local.md'), [
    '---', 'published: true', 'title: Local video', 'date: 2026-10-31', '---',
    '<video controls src="../attachments/片段%20one.mp4"></video>',
  ].join('\n'))
  const { gallery } = await loadObsidianContent({ blogRoot: root, sections: ['gallery'] })
  assert.equal(gallery[0].images[0].kind, 'video')
  assert.equal(gallery[0].images[0].src, '/obsidian/attachments/%E7%89%87%E6%AE%B5%20one.mp4')
  const copied = await copyPublishedAttachments({ blogRoot: root, posts: gallery, destinationRoot: path.join(root, 'out') })
  assert.deepEqual(copied, ['attachments/片段 one.mp4'])
})

async function fakePlugin() {
  const source = await fs.readFile(new URL('../obsidian/blog-create/main.js', import.meta.url), 'utf8')
  const context = { module: { exports: {} }, console, window: {}, require: (id) => id === 'obsidian'
    ? { Modal: class {}, Plugin: class {}, parseYaml: YAML.parse, normalizePath: (value) => value }
    : model }
  vm.runInNewContext(source, context)
  const plugin = new context.module.exports()
  const files = new Map([['Blog/gallery', { path: 'Blog/gallery', children: [] }]])
  let settings = { galleryToken: 'persisted-token' }
  const vault = {
    getAbstractFileByPath: (value) => files.get(value),
    read: async (file) => file.source,
    create: async (value, content) => {
      const file = { path: value, source: content }
      files.set(value, file)
      files.get('Blog/gallery').children.push(file)
      return file
    },
    process: async (file, update) => { file.source = update(file.source) },
  }
  plugin.app = { vault }
  plugin.loadData = async () => settings
  plugin.saveData = async (value) => { settings = value }
  return { plugin, files, settings: () => settings, remove: (file) => {
    files.delete(file.path)
    files.get('Blog/gallery').children = files.get('Blog/gallery').children.filter((item) => item !== file)
  } }
}

test('Obsidian imports each album once, preserves local edits/deletions and refuses to recreate a lost registry', async () => {
  const f = await fakePlugin()
  await f.plugin.mirrorOnlineAlbums([album])
  const [note] = [...f.files.values()].filter((file) => file.path.endsWith('.md') && file.path !== model.CONTROL_PATH)
  assert.ok(note.source.includes('<video controls'))
  assert.equal(f.settings().galleryToken, 'persisted-token')
  note.source = note.source.replace('照片与视频', '本地修改').replace(/<video.*<\/video>\n/, '')
  const edited = note.source
  await Promise.all([f.plugin.mirrorOnlineAlbums([album]), f.plugin.mirrorOnlineAlbums([album])])
  assert.equal(note.source, edited)
  assert.equal((await f.plugin.managedAlbums())[0].images.length, 2)
  f.remove(note)
  await f.plugin.mirrorOnlineAlbums([album])
  assert.equal((await f.plugin.managedAlbums()).length, 0)
  f.remove(f.files.get(model.CONTROL_PATH))
  await assert.rejects(() => f.plugin.mirrorOnlineAlbums([album]), /记录已丢失/)
})
