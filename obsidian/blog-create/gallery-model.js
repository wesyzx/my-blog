/* Pure helpers shared by the plugin and its synchronization tests. */
const CONTROL_PATH = 'Blog/gallery/相册同步记录.md'
const CONTROL_TYPE = 'blog-gallery-control'
const MANAGED_BY = 'blog-create-vault-gallery'
const json = (value) => JSON.stringify(value)

function mediaSummary(album) {
  const media = Array.isArray(album.images) ? album.images : []
  const videos = media.filter((item) => item.kind === 'video').length
  return `${media.length - videos} 张照片 · ${videos} 个视频`
}

function editableAlbumContent(album) {
  const media = (album.images || []).filter((item) => item.src)
  return [
    '---',
    `published: ${album.published === true}`,
    `title: ${json(album.title)}`,
    `slug: ${json(album.slug)}`,
    `date: ${json(album.date)}`,
    `category: ${json(album.category || '日常')}`,
    `excerpt: ${json(album.excerpt || '')}`,
    `managedBy: ${MANAGED_BY}`,
    `remoteAlbumId: ${json(album.id)}`,
    `aliases: ${json(album.aliases || [])}`,
    `mediaMetadata: ${json(media)}`,
    '---', '',
    '> 此相册由 Obsidian 管理。删除下方照片或视频的整行引用，博客会在同步构建后移除对应内容。',
    '> 删除整篇笔记会下线整个相册；R2 原文件不会立即删除。上传超过 30 天且无人引用的文件，会在发布核对成功后自动清理。',
    '> mediaMetadata 只保存尺寸和时长；博客内容以下方的媒体引用为准。', '',
    ...media.flatMap((item, index) => [
      item.kind === 'video'
        ? `<video controls playsinline preload="metadata" src="${encodeURI(item.src).replace(/"/g, '%22')}" width="480"></video>`
        : `![照片 ${index + 1}](<${item.src}>)`, '',
    ]),
  ].join('\n')
}

function controlContent(ids) {
  return [
    '---', 'published: false', `type: ${CONTROL_TYPE}`, 'version: 1',
    `albumIds: ${json([...new Set(ids)].sort())}`, '---', '',
    '# 相册同步记录', '',
    '这是防止已删除相册被线上同步恢复的管理记录，请保留此笔记。',
    '在 Blog/gallery 的相册笔记中编辑照片和视频。此记录不会作为文章显示在博客上。', '',
  ].join('\n')
}

module.exports = { CONTROL_PATH, CONTROL_TYPE, MANAGED_BY, mediaSummary, editableAlbumContent, controlContent }
