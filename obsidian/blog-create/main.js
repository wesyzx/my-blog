/* eslint-disable @typescript-eslint/no-require-imports -- Obsidian loads plugins as CommonJS. */
const {
  Modal,
  Notice,
  Plugin,
  Setting,
  normalizePath,
  requestUrl,
  parseYaml,
} = require('obsidian')
const { CONTROL_PATH, CONTROL_TYPE, MANAGED_BY, mediaSummary, editableAlbumContent, controlContent } = require('./gallery-model')
const { r2Sources } = require('../../lib/r2-media.mjs')

const GALLERY_API_ORIGIN = 'https://img.215320.xyz'
const GALLERY_PUBLIC_ORIGIN = 'https://guanyan.me/gallery'
const R2_CLEANUP_PATH = '/internal/gallery/r2-cleanup'

const CONTENT_TYPES = {
  posts: {
    label: '博文',
    folder: 'posts',
    template: '博客文章.md',
    icon: 'file-text',
  },
  food: {
    label: '美食',
    folder: 'food',
    template: '美食模板.md',
    icon: 'utensils',
  },
  gallery: {
    label: '相册',
    folder: 'gallery',
    template: '相册模板.md',
    icon: 'image',
  },
}

function localDate() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function safeFileName(title) {
  return title
    .trim()
    .replace(/[\\/:*?"<>|#^[\]]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^\.+|\.+$/g, '')
    .trim()
}

function mirrorFileName(album) {
  const title = safeFileName(album.title) || '未命名相册'
  return `${title}-${album.id.slice(0, 8)}.md`
}

function noteData(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  return match ? parseYaml(match[1]) || {} : {}
}

function noteMedia(source) {
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
  const matches = [
    ...[...body.matchAll(/!\[[^\]]*\]\((<[^>]+>|[^)"\n]+?)(?:\s+"[^"]*")?\)/g)]
      .map((match) => ({ index: match.index, embed: match[0], src: match[1].replace(/^<|>$/g, '') })),
    ...[...body.matchAll(/<video\b[^>]*\bsrc=["']([^"']+)["'][^>]*>[\s\S]*?<\/video>/gi)]
      .map((match) => ({ index: match.index, embed: match[0], src: match[1], kind: 'video' })),
    ...[...body.matchAll(/!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g)]
      .map((match) => ({ index: match.index, embed: match[0], src: match[1] })),
  ].sort((a, b) => a.index - b.index)
  return matches.map((item) => ({ ...item, kind: item.kind || (/\.(mp4|mov|m4v|webm|ogv)(?:[?#]|$)/i.test(item.src) ? 'video' : 'image') }))
}

function fillFrontmatter(source, title) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) {
    throw new Error('模板缺少 YAML frontmatter')
  }

  let frontmatter = match[1]
  const titleLine = `title: ${JSON.stringify(title)}`
  const dateLine = `date: "${localDate()}"`

  frontmatter = /^title:.*$/m.test(frontmatter)
    ? frontmatter.replace(/^title:.*$/m, titleLine)
    : `${titleLine}\n${frontmatter}`
  frontmatter = /^date:.*$/m.test(frontmatter)
    ? frontmatter.replace(/^date:.*$/m, dateLine)
    : `${frontmatter}\n${dateLine}`

  return `---\n${frontmatter}\n---\n${source.slice(match[0].length).trimStart()}`
}

class TitleModal extends Modal {
  constructor(app, type, onCreate) {
    super(app)
    this.type = type
    this.config = CONTENT_TYPES[type]
    this.onCreate = onCreate
    this.title = ''
    this.submitting = false
  }

  onOpen() {
    const { contentEl } = this
    contentEl.createEl('h2', { text: `新建${this.config.label}` })
    contentEl.createEl('p', {
      text: `将创建到 Blog/${this.config.folder}/，并自动填写今天的日期。`,
      cls: 'setting-item-description',
    })

    const setting = new Setting(contentEl)
      .setName('标题')
      .addText((text) => {
        this.titleInput = text.inputEl
        text.setPlaceholder(`输入${this.config.label}标题`)
        text.onChange((value) => {
          this.title = value
        })
      })

    setting.settingEl.addClass('blog-create-title-setting')

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText('取消')
          .onClick(() => this.close())
      })
      .addButton((button) => {
        button
          .setButtonText('创建')
          .setCta()
          .onClick(() => this.submit())
      })

    contentEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault()
        this.submit()
      }
    })

    window.setTimeout(() => this.titleInput?.focus(), 0)
  }

  async submit() {
    if (this.submitting) return
    const title = this.title.trim()
    if (!title) {
      new Notice('请先填写标题')
      this.titleInput?.focus()
      return
    }

    this.submitting = true
    try {
      await this.onCreate(title)
      this.close()
    } catch (error) {
      console.error('Blog Create:', error)
      new Notice(`创建失败：${error.message}`)
      this.submitting = false
    }
  }

  onClose() {
    this.contentEl.empty()
  }
}

function openExternal(url) {
  const opened = window.open(url, '_blank')
  if (opened) opened.opener = null
}

function responseError(response, fallback) {
  try {
    if (response.json?.error) return response.json.error
  } catch {}
  return fallback
}

class DeleteAlbumModal extends Modal {
  constructor(app, album, onConfirm) {
    super(app)
    this.album = album
    this.onConfirm = onConfirm
  }

  onOpen() {
    const { contentEl } = this
    contentEl.addClass('blog-delete-modal')
    contentEl.createEl('h2', { text: '下线相册' })
    const detail = contentEl.createDiv({ cls: 'blog-delete-summary' })
    detail.createEl('strong', { text: this.album.title })
    detail.createEl('span', {
      text: `${this.album.date || '日期未知'} · ${mediaSummary(this.album)}`,
    })
    contentEl.createEl('p', {
      text: '相册笔记将移到 Obsidian 回收站，阿里云同步构建后博客将下线此相册。R2 原文件不会立即删除；上传超过 30 天且无人引用时，会在发布核对成功后自动清理。',
    })

    const actions = contentEl.createDiv({ cls: 'blog-delete-actions' })
    const cancel = actions.createEl('button', { text: '取消', attr: { type: 'button' } })
    cancel.addEventListener('click', () => this.close())
    const remove = actions.createEl('button', {
      cls: 'mod-warning',
      text: '确认下线',
      attr: { type: 'button' },
    })
    remove.addEventListener('click', () => {
      this.close()
      this.onConfirm()
    })
  }

  onClose() {
    this.contentEl.empty()
  }
}

class R2CleanupModal extends Modal {
  constructor(app, plugin, preview, onConfirm) {
    super(app)
    this.plugin = plugin
    this.preview = preview
    this.onConfirm = onConfirm
  }

  onOpen() {
    const { contentEl } = this
    contentEl.addClass('blog-delete-modal')
    contentEl.createEl('h2', { text: 'R2 孤立文件检查' })
    contentEl.createEl('p', {
      text: `只处理超过 ${this.preview.graceDays || 30} 天、当前没有任何笔记引用的文件。仍被引用或未满宽限期的文件会保留。`,
    })
    const summary = contentEl.createDiv({ cls: 'blog-delete-summary' })
    summary.createEl('strong', { text: `${this.preview.candidateCount || 0} 个可删除文件` })
    summary.createEl('span', {
      text: `已保护 ${this.preview.protectedCount || 0} 个引用文件，跳过 ${this.preview.recentCount || 0} 个近期文件`,
    })
    if (this.preview.candidates?.length) {
      const list = contentEl.createEl('ul', { cls: 'blog-r2-cleanup-list' })
      for (const item of this.preview.candidates.slice(0, 20)) {
        list.createEl('li', { text: `${item.key} · ${new Date(item.uploaded).toLocaleDateString()}` })
      }
    }
    contentEl.createEl('p', {
      text: '删除后无法从 R2 恢复。若仍需保留旧文章或外部链接，请先取消。',
      cls: 'setting-item-description',
    })

    const actions = contentEl.createDiv({ cls: 'blog-delete-actions' })
    const cancel = actions.createEl('button', { text: '取消', attr: { type: 'button' } })
    cancel.addEventListener('click', () => this.close())
    const remove = actions.createEl('button', {
      cls: 'mod-warning',
      text: this.preview.candidateCount ? '确认永久删除' : '关闭',
      attr: { type: 'button' },
    })
    remove.addEventListener('click', async () => {
      if (!this.preview.candidateCount) {
        this.close()
        return
      }
      remove.disabled = true
      remove.setText('正在删除…')
      try {
        await this.onConfirm()
        this.close()
      } catch (error) {
        remove.disabled = false
        remove.setText('确认永久删除')
        new Notice(`R2 清理失败：${error.message}`)
      }
    })
  }

  onClose() {
    this.contentEl.empty()
  }
}

class GalleryMediaModal extends Modal {
  constructor(app, plugin, album) {
    super(app)
    this.plugin = plugin
    this.album = album
  }

  async onOpen() {
    this.modalEl.addClass('blog-gallery-modal')
    await this.render()
  }

  async render() {
    const { contentEl } = this
    contentEl.empty()
    const file = this.app.vault.getAbstractFileByPath(this.album.notePath)
    if (!file) { contentEl.createEl('p', { text: '相册笔记已删除。' }); return }
    const source = await this.app.vault.read(file)
    const media = noteMedia(source)
    contentEl.createEl('h2', { text: `${this.album.title} · 照片与视频` })
    contentEl.createEl('p', { text: '移除后自动同步到博客。R2 原文件不会立即删除；上传超过 30 天且无人引用时自动清理。也可以打开笔记编辑日期、顺序、标题和视频封面。' })
    const edit = contentEl.createEl('button', { text: '打开相册笔记' })
    edit.addEventListener('click', async () => {
      await this.app.workspace.getLeaf(false).openFile(file)
      this.close()
    })
    const list = contentEl.createDiv({ cls: 'blog-media-list' })
    for (const [index, item] of media.entries()) {
      const row = list.createDiv({ cls: 'blog-media-row' })
      const preview = this.plugin.mediaPreviewSource(item.src, file.path)
      if (item.kind === 'video') {
        row.createEl('video', { attr: { src: preview, controls: '', preload: 'metadata', playsinline: '' } })
      } else {
        row.createEl('img', { attr: { src: preview, loading: 'lazy', alt: `照片 ${index + 1}` } })
      }
      const actions = row.createDiv()
      actions.createEl('span', { text: `${index + 1} · ${item.kind === 'video' ? '视频' : '照片'}` })
      const remove = actions.createEl('button', { text: '从相册移除', cls: 'mod-warning' })
      remove.addEventListener('click', async () => {
        remove.disabled = true
        try {
          await this.app.vault.process(file, (current) => {
            const header = current.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0] || ''
            return header + current.slice(header.length).replace(item.embed, '')
          })
          new Notice('已从相册移除，等待 LiveSync 同步及阿里云构建。')
          await this.render()
        } catch (error) {
          remove.disabled = false
          new Notice(`移除失败：${error.message}`)
        }
      })
    }
    if (!media.length) contentEl.createEl('p', { text: '相册已清空，构建后将从博客消失。' })
  }
}

class GalleryManagerModal extends Modal {
  constructor(app, plugin) {
    super(app)
    this.plugin = plugin
    this.loading = false
  }

  onOpen() {
    this.modalEl.addClass('blog-gallery-modal')
    this.contentEl.addClass('blog-gallery-manager')
    if (this.plugin.sessionToken) {
      this.loadAlbums()
    } else {
      this.renderAuth()
    }
  }

  renderAuth(message = '') {
    const { contentEl } = this
    contentEl.empty()
    contentEl.createEl('h2', { text: '管理线上相册' })
    contentEl.createEl('p', {
      text: '首次输入相册上传令牌后会自动保存在本机插件配置中，以后无需重复输入。',
      cls: 'setting-item-description',
    })

    let token = ''
    const setting = new Setting(contentEl)
      .setName('上传令牌')
      .addText((text) => {
        text.inputEl.type = 'password'
        text.inputEl.autocomplete = 'off'
        text.setPlaceholder('输入令牌')
        text.onChange((value) => { token = value.trim() })
        this.tokenInput = text.inputEl
      })
    setting.settingEl.addClass('blog-token-setting')

    const status = contentEl.createDiv({ cls: 'blog-gallery-status', text: message })
    const actions = contentEl.createDiv({ cls: 'blog-gallery-auth-actions' })
    const connect = actions.createEl('button', {
      cls: 'mod-cta',
      text: '连接并读取相册',
      attr: { type: 'button' },
    })
    connect.addEventListener('click', async () => {
      if (!token) {
        status.setText('请先输入上传令牌。')
        status.addClass('is-error')
        return
      }
      connect.disabled = true
      status.removeClass('is-error')
      status.setText('正在验证令牌…')
      try {
        const response = await this.request('/internal/gallery/albums', token)
        await this.plugin.setGalleryToken(token)
        await this.plugin.mirrorOnlineAlbums(response.albums || [])
        this.renderAlbums(await this.plugin.managedAlbums())
      } catch (error) {
        connect.disabled = false
        status.setText(error.message)
        status.addClass('is-error')
      }
    })
    window.setTimeout(() => this.tokenInput?.focus(), 0)
  }

  async request(path, token = this.plugin.sessionToken, method = 'GET', body) {
    return this.plugin.requestGallery(path, token, method, body)
  }

  async cleanupPayload() {
    const protectedSources = new Set()
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith('Blog/') || file.path.startsWith('Blog/templates/')) continue
      const source = await this.app.vault.read(file)
      const header = source.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0] || ''
      const data = noteData(source)
      for (const value of r2Sources(source.slice(header.length), data)) protectedSources.add(value)
    }
    const control = this.app.vault.getAbstractFileByPath(CONTROL_PATH)
    const managedAlbumIds = control
      ? (noteData(await this.app.vault.read(control)).albumIds || [])
      : []
    return {
      protectedSources: [...protectedSources].sort(),
      managedAlbumIds: managedAlbumIds.filter((id) => /^[a-f0-9-]{36}$/.test(id)),
      graceDays: 30,
    }
  }

  async previewR2Cleanup() {
    const status = this.contentEl.querySelector('.blog-gallery-status')
    status?.setText('正在检查 R2 孤立文件…')
    try {
      const payload = await this.cleanupPayload()
      const preview = await this.request(R2_CLEANUP_PATH, this.plugin.sessionToken, 'POST', {
        ...payload,
        dryRun: true,
      })
      status?.setText('检查完成。')
      new R2CleanupModal(this.app, this.plugin, preview, async () => {
        const fresh = await this.cleanupPayload()
        const result = await this.request(R2_CLEANUP_PATH, this.plugin.sessionToken, 'POST', {
          ...fresh,
          dryRun: false,
          confirm: 'delete-unreferenced-r2',
        })
        new Notice(`R2 清理完成：删除 ${result.deleted || 0} 个文件。`)
      }).open()
    } catch (error) {
      status?.setText(error.message)
      status?.addClass('is-error')
    }
  }

  async loadAlbums(message = '正在读取相册…') {
    if (this.loading) return
    this.loading = true
    try {
      const response = await this.request('/internal/gallery/albums')
      const albums = response.albums || []
      try {
        await this.plugin.mirrorOnlineAlbums(albums)
      } catch (error) {
        console.warn('Blog Create: unable to mirror online albums', error)
        new Notice(`线上相册已读取，但无法同步到 Blog/gallery：${error.message}`)
      }
      this.renderAlbums(await this.plugin.managedAlbums(), message === '正在读取相册…' ? '' : message)
    } catch (error) {
      if (!this.plugin.sessionToken) {
        this.renderAuth('令牌已失效，请重新输入。')
      } else {
        new Notice(`读取相册失败：${error.message}`)
      }
    } finally {
      this.loading = false
    }
  }

  async deleteAlbum(album) {
    const status = this.contentEl.querySelector('.blog-gallery-status')
    status?.setText('正在移除相册笔记…')
    try {
      const file = this.app.vault.getAbstractFileByPath(album.notePath)
      if (file) await this.app.fileManager.trashFile(file)
      const message = '相册已下线，等待 LiveSync 同步及阿里云构建。'
      new Notice(message)
      this.renderAlbums(await this.plugin.managedAlbums(), message)
    } catch (error) {
      status?.setText(error.message)
      status?.addClass('is-error')
    }
  }

  renderAlbums(albums, message = '') {
    const { contentEl } = this
    contentEl.empty()
    const header = contentEl.createDiv({ cls: 'blog-gallery-manager-header' })
    const heading = header.createDiv()
    heading.createEl('h2', { text: '相册与视频管理' })
    heading.createEl('p', {
      text: 'Obsidian 是管理入口。照片、视频及整篇相册的修改，由 LiveSync → 阿里云 → GitHub → 博客自动更新。',
      cls: 'setting-item-description',
    })

    const headerActions = header.createDiv({ cls: 'blog-gallery-header-actions' })
    const website = headerActions.createEl('button', { text: '打开相册页', attr: { type: 'button' } })
    website.addEventListener('click', () => openExternal(GALLERY_PUBLIC_ORIGIN))
    const refresh = headerActions.createEl('button', { text: '刷新', attr: { type: 'button' } })
    refresh.addEventListener('click', () => this.loadAlbums())
    const cleanup = headerActions.createEl('button', { text: '检查 R2 孤立文件', attr: { type: 'button' } })
    cleanup.addEventListener('click', () => this.previewR2Cleanup())
    const logout = headerActions.createEl('button', { text: '更换令牌', attr: { type: 'button' } })
    logout.addEventListener('click', async () => {
      await this.plugin.clearGalleryToken()
      this.renderAuth()
    })

    contentEl.createDiv({
      cls: `blog-gallery-status${message ? ' is-success' : ''}`,
      text: message || `共 ${albums.length} 个相册`,
    })
    if (!albums.length) {
      contentEl.createDiv({
        cls: 'blog-gallery-empty',
        text: '还没有通过快捷指令创建的相册。',
      })
      return
    }

    const list = contentEl.createDiv({ cls: 'blog-gallery-list' })
    for (const album of albums) {
      const row = list.createDiv({ cls: 'blog-gallery-row' })
      const summary = row.createDiv({ cls: 'blog-gallery-row-summary' })
      const titleLine = summary.createDiv({ cls: 'blog-gallery-title-line' })
      titleLine.createEl('strong', { text: album.title })
      titleLine.createSpan({
        cls: `blog-gallery-state${album.published ? ' is-published' : ''}`,
        text: album.published ? '已发布' : '私密',
      })
      summary.createDiv({
        cls: 'blog-gallery-meta',
        text: `${album.date || '日期未知'} · ${mediaSummary(album)} · /${album.slug}`,
      })

      const actions = row.createDiv({ cls: 'blog-gallery-row-actions' })
      const edit = actions.createEl('button', { text: '管理照片和视频', attr: { type: 'button' } })
      edit.addEventListener('click', () => new GalleryMediaModal(this.app, this.plugin, album).open())
      if (album.published) {
        const view = actions.createEl('button', { text: '查看', attr: { type: 'button' } })
        view.addEventListener('click', () => openExternal(`${GALLERY_PUBLIC_ORIGIN}/${encodeURIComponent(album.slug)}`))
      }
      const remove = actions.createEl('button', {
        cls: 'mod-warning',
        text: '下线',
        attr: { type: 'button' },
      })
      remove.addEventListener('click', () => {
        new DeleteAlbumModal(this.app, album, () => this.deleteAlbum(album)).open()
      })
    }
  }

  onClose() {
    this.contentEl.empty()
  }
}

module.exports = class BlogCreatePlugin extends Plugin {
  async onload() {
    const data = await this.loadData()
    this.sessionToken = typeof data?.galleryToken === 'string' ? data.galleryToken : ''

    this.addRibbonIcon('file-plus-2', '新建博文', () => {
      this.openCreate('posts')
    })
    this.addRibbonIcon('utensils', '新建美食', () => {
      this.openCreate('food')
    })
    this.addRibbonIcon('image-plus', '新建相册', () => {
      this.openCreate('gallery')
    })
    this.addRibbonIcon('images', '管理相册与视频', () => {
      this.openGalleryManager()
    })

    this.addCommand({
      id: 'manage-gallery-albums',
      name: '管理相册与视频',
      callback: () => this.openGalleryManager(),
    })
    this.addCommand({
      id: 'sync-online-gallery',
      name: '同步线上相册到 Blog/gallery',
      callback: async () => {
        if (!this.sessionToken) {
          new Notice('请先打开“管理线上相册”并输入令牌')
          this.openGalleryManager()
          return
        }
        try {
          const result = await this.syncOnlineAlbums()
          new Notice(`已读取 ${result.albumCount} 个线上相册，新增内容已导入 Blog/gallery；本地修改及删除保持优先。`)
        } catch (error) {
          new Notice(`同步线上相册失败：${error.message}`)
        }
      },
    })

    for (const [type, config] of Object.entries(CONTENT_TYPES)) {
      this.addCommand({
        id: `new-${type}`,
        name: `新建${config.label}`,
        callback: () => this.openCreate(type),
      })
    }

    if (this.sessionToken) {
      window.setTimeout(() => {
        this.syncOnlineAlbums().catch((error) => {
          console.warn('Blog Create: automatic gallery sync failed', error)
        })
      }, 1000)
    }
    this.registerInterval(window.setInterval(() => {
      if (this.sessionToken) this.syncOnlineAlbums().catch((error) => {
        console.warn('Blog Create: gallery import failed', error)
      })
    }, 60_000))
  }

  openCreate(type) {
    new TitleModal(this.app, type, (title) => this.createNote(type, title)).open()
  }

  openGalleryManager() {
    new GalleryManagerModal(this.app, this).open()
  }

  async setGalleryToken(token) {
    const data = (await this.loadData()) || {}
    this.sessionToken = token
    await this.saveData({ ...data, galleryToken: token })
  }

  async clearGalleryToken() {
    this.sessionToken = ''
    const data = (await this.loadData()) || {}
    delete data.galleryToken
    await this.saveData(data)
  }

  async requestGallery(path, token = this.sessionToken, method = 'GET', body) {
    const options = {
      url: `${GALLERY_API_ORIGIN}${path}`,
      method,
      headers: { Authorization: `Bearer ${token}` },
      throw: false,
    }
    if (body !== undefined) {
      options.body = JSON.stringify(body)
      options.contentType = 'application/json'
    }
    const response = await requestUrl(options)
    if (response.status < 200 || response.status >= 300) {
      if (response.status === 401) await this.clearGalleryToken()
      throw new Error(responseError(response, `请求失败（HTTP ${response.status}）`))
    }
    return response.json
  }

  async syncOnlineAlbums() {
    if (this.syncingAlbums) return this.syncingAlbums
    this.syncingAlbums = (async () => {
      const response = await this.requestGallery('/internal/gallery/albums')
      const albums = response.albums || []
      await this.mirrorOnlineAlbums(albums)
      return { albumCount: albums.length }
    })()
    try { return await this.syncingAlbums } finally { this.syncingAlbums = null }
  }

  async mirrorOnlineAlbums(albums) {
    // Serialize manager refreshes with background imports too.
    const previous = this.importQueue || Promise.resolve()
    this.importQueue = previous.catch(() => {}).then(() => this.importNewAlbums(albums))
    return this.importQueue
  }

  async managedAlbums() {
    const result = []
    const folder = this.app.vault.getAbstractFileByPath('Blog/gallery')
    for (const file of folder?.children || []) {
      if (!file.path.endsWith('.md') || file.path === CONTROL_PATH) continue
      const source = await this.app.vault.read(file)
      const data = noteData(source)
      if (data.managedBy !== MANAGED_BY) continue
      result.push({
        ...data, id: data.remoteAlbumId, notePath: file.path,
        images: noteMedia(source), published: data.published === true,
      })
    }
    return result.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }

  mediaPreviewSource(src, notePath) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return src
    let target = src
    try { target = decodeURIComponent(src) } catch {}
    const file = this.app.metadataCache.getFirstLinkpathDest(target, notePath)
    return file ? this.app.vault.getResourcePath(file) : src
  }

  async importNewAlbums(albums) {
    const folderPath = normalizePath('Blog/gallery')
    if (!this.app.vault.getAbstractFileByPath(folderPath)) {
      await this.app.vault.createFolder(folderPath)
    }

    const folder = this.app.vault.getAbstractFileByPath(folderPath)
    const existing = new Map()
    for (const child of folder?.children || []) {
      if (!child.path.endsWith('.md')) continue
      const source = await this.app.vault.read(child)
      const data = noteData(source)
      if (data.managedBy === MANAGED_BY && data.remoteAlbumId) existing.set(data.remoteAlbumId, child)
    }

    let controlFile = this.app.vault.getAbstractFileByPath(CONTROL_PATH)
    const control = controlFile ? noteData(await this.app.vault.read(controlFile)) : null
    if (controlFile && (control.type !== CONTROL_TYPE || control.version !== 1 || !Array.isArray(control.albumIds))) {
      throw new Error('相册同步记录无效，请恢复记录后再同步。')
    }
    const settings = (await this.loadData()) || {}
    if (!controlFile && settings.galleryControlInitialized) {
      throw new Error('相册同步记录已丢失，请从回收站恢复，防止重新导入已删除相册。')
    }
    const known = new Set(control?.albumIds || [])
    for (const id of existing.keys()) known.add(id)
    for (const album of albums) {
      if (!album?.id) continue
      if (known.has(album.id)) continue
      // A Shortcut creates a private record before uploading; do not freeze a partial upload.
      if (album.published !== true) continue
      const base = normalizePath(`${folderPath}/${mirrorFileName(album).replace(/\.md$/, '')}`)
      let target = `${base}.md`
      let suffix = 2
      while (this.app.vault.getAbstractFileByPath(target)) target = `${base} ${suffix++}.md`
      await this.app.vault.create(target, editableAlbumContent(album))
      known.add(album.id)
    }
    const source = controlContent([...known])
    if (!controlFile) {
      controlFile = await this.app.vault.create(CONTROL_PATH, source)
    } else {
      if (await this.app.vault.read(controlFile) !== source) await this.app.vault.process(controlFile, (current) => {
        const latest = noteData(current)
        if (latest.type !== CONTROL_TYPE || !Array.isArray(latest.albumIds)) throw new Error('相册同步记录无效')
        return controlContent([...latest.albumIds, ...known])
      })
    }
    if (!settings.galleryControlInitialized) {
      await this.saveData({ ...settings, galleryControlInitialized: true })
    }
    // Retire the old generated mirrors so only editable notes remain in use.
    const legacy = this.app.vault.getAbstractFileByPath('Blog/gallery/线上相册')
    for (const file of [...(legacy?.children || [])]) {
      if (!file.path.endsWith('.md')) continue
      const data = noteData(await this.app.vault.read(file))
      if (data.managedBy === 'blog-create-online-gallery' && known.has(data.remoteAlbumId)) {
        await this.app.fileManager.trashFile(file)
      }
    }
  }

  async createNote(type, title) {
    const config = CONTENT_TYPES[type]
    const fileName = safeFileName(title)
    if (!fileName) throw new Error('标题无法用作文件名')

    const templatePath = normalizePath(`Blog/templates/${config.template}`)
    const template = await this.app.vault.adapter.read(templatePath)
    let content = fillFrontmatter(template, title)
    if (type === 'gallery') content = content.replace(/^---\r?\n/, `---\nmanagedBy: ${MANAGED_BY}\n`)

    const folder = normalizePath(`Blog/${config.folder}`)
    if (!this.app.vault.getAbstractFileByPath(folder)) {
      await this.app.vault.createFolder(folder)
    }

    const basePath = normalizePath(`${folder}/${fileName}`)
    let notePath = `${basePath}.md`
    let suffix = 2
    while (this.app.vault.getAbstractFileByPath(notePath)) {
      notePath = `${basePath} ${suffix++}.md`
    }

    const file = await this.app.vault.create(notePath, content)
    await this.app.workspace.getLeaf(false).openFile(file)
    new Notice(`已创建${config.label}：${file.basename}`)
  }
}
