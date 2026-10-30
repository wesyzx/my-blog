const {
  Modal,
  Notice,
  Plugin,
  Setting,
  normalizePath,
  requestUrl,
} = require('obsidian')

const GALLERY_API_ORIGIN = 'https://img.215320.xyz'
const GALLERY_PUBLIC_ORIGIN = 'https://guanyan.me/gallery'

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

function yamlString(value) {
  return JSON.stringify(String(value || ''))
}

function galleryMirrorContent(album) {
  const images = Array.isArray(album.images) ? album.images : []
  const cover = album.cover || images[0]?.src || ''
  const publicUrl = album.published
    ? `${GALLERY_PUBLIC_ORIGIN}/${encodeURIComponent(album.slug)}`
    : ''
  const state = album.published ? '已发布' : '私密'
  const lines = [
    '---',
    'published: false',
    `title: ${yamlString(album.title)}`,
    `date: ${yamlString(album.date)}`,
    `category: ${yamlString(album.category || '日常')}`,
    'managedBy: blog-create-online-gallery',
    `remoteAlbumId: ${yamlString(album.id)}`,
    `remoteSlug: ${yamlString(album.slug)}`,
    `remoteState: ${yamlString(album.published ? 'published' : 'private')}`,
    `cover: ${yamlString(cover)}`,
    '---',
    '',
    `> [!info] 线上相册 · ${state}`,
    `> ${album.date || '日期未知'} · ${album.photoCount} 张照片`,
    ...(publicUrl ? [`> [在博客中打开](${publicUrl})`] : ['> 这个相册尚未发布到博客。']),
    '',
    `# ${album.title}`,
    '',
    '此笔记由 Blog Create 根据线上相册自动生成，手动修改会在下次同步时覆盖。',
  ]

  if (cover) {
    lines.push('', `![${album.title} 封面](${cover})`)
  }
  if (images.length) {
    lines.push('', '## 相册照片', '')
    images.forEach((image, index) => {
      if (image.src) lines.push(`![${album.title} ${index + 1}](${image.src})`, '')
    })
  }
  return `${lines.join('\n').trimEnd()}\n`
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
    contentEl.createEl('h2', { text: '永久删除相册' })
    const detail = contentEl.createDiv({ cls: 'blog-delete-summary' })
    detail.createEl('strong', { text: this.album.title })
    detail.createEl('span', {
      text: `${this.album.date || '日期未知'} · ${this.album.photoCount} 张照片`,
    })
    contentEl.createEl('p', {
      text: this.album.published
        ? '相册记录、原图和公开清单都会被删除，并自动触发网站更新。此操作无法撤销。'
        : '相册记录和原图都会被删除。此操作无法撤销。',
    })

    const actions = contentEl.createDiv({ cls: 'blog-delete-actions' })
    const cancel = actions.createEl('button', { text: '取消', attr: { type: 'button' } })
    cancel.addEventListener('click', () => this.close())
    const remove = actions.createEl('button', {
      cls: 'mod-warning',
      text: '确认永久删除',
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
        this.renderAlbums(response.albums || [])
      } catch (error) {
        connect.disabled = false
        status.setText(error.message)
        status.addClass('is-error')
      }
    })
    window.setTimeout(() => this.tokenInput?.focus(), 0)
  }

  async request(path, token = this.plugin.sessionToken, method = 'GET') {
    return this.plugin.requestGallery(path, token, method)
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
      this.renderAlbums(albums, message === '正在读取相册…' ? '' : message)
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
    status?.setText(album.published ? '正在删除相册并触发网站更新…' : '正在删除相册…')
    try {
      const result = await this.request(
        `/internal/gallery/albums/${encodeURIComponent(album.id)}`,
        this.plugin.sessionToken,
        'DELETE',
      )
      new Notice(`${result.message} 已删除 ${result.deletedPhotos} 张照片。`)
      await this.loadAlbums(result.message)
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
    heading.createEl('h2', { text: '线上相册' })
    heading.createEl('p', {
      text: '管理 iPhone 快捷指令上传的相册。删除已发布相册会自动更新网站。',
      cls: 'setting-item-description',
    })

    const headerActions = header.createDiv({ cls: 'blog-gallery-header-actions' })
    const website = headerActions.createEl('button', { text: '打开相册页', attr: { type: 'button' } })
    website.addEventListener('click', () => openExternal(GALLERY_PUBLIC_ORIGIN))
    const refresh = headerActions.createEl('button', { text: '刷新', attr: { type: 'button' } })
    refresh.addEventListener('click', () => this.loadAlbums())
    const logout = headerActions.createEl('button', { text: '更换令牌', attr: { type: 'button' } })
    logout.addEventListener('click', async () => {
      await this.plugin.clearGalleryToken()
      this.renderAuth()
    })

    const status = contentEl.createDiv({
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
        text: `${album.date || '日期未知'} · ${album.photoCount} 张 · /${album.slug}`,
      })

      const actions = row.createDiv({ cls: 'blog-gallery-row-actions' })
      if (album.published) {
        const view = actions.createEl('button', { text: '查看', attr: { type: 'button' } })
        view.addEventListener('click', () => openExternal(`${GALLERY_PUBLIC_ORIGIN}/${encodeURIComponent(album.slug)}`))
      }
      const remove = actions.createEl('button', {
        cls: 'mod-warning',
        text: '删除',
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
    this.addRibbonIcon('images', '管理线上相册', () => {
      this.openGalleryManager()
    })

    this.addCommand({
      id: 'manage-gallery-albums',
      name: '管理线上相册',
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
          new Notice(`已同步 ${result.albumCount} 个线上相册到 Blog/gallery/线上相册`)
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

  async requestGallery(path, token = this.sessionToken, method = 'GET') {
    const response = await requestUrl({
      url: `${GALLERY_API_ORIGIN}${path}`,
      method,
      headers: { Authorization: `Bearer ${token}` },
      throw: false,
    })
    if (response.status < 200 || response.status >= 300) {
      if (response.status === 401) await this.clearGalleryToken()
      throw new Error(responseError(response, `请求失败（HTTP ${response.status}）`))
    }
    return response.json
  }

  async syncOnlineAlbums() {
    const response = await this.requestGallery('/internal/gallery/albums')
    const albums = response.albums || []
    await this.mirrorOnlineAlbums(albums)
    return { albumCount: albums.length }
  }

  async mirrorOnlineAlbums(albums) {
    const folderPath = normalizePath('Blog/gallery/线上相册')
    if (!this.app.vault.getAbstractFileByPath(folderPath)) {
      await this.app.vault.createFolder(folderPath)
    }

    const folder = this.app.vault.getAbstractFileByPath(folderPath)
    const existing = new Map()
    for (const child of folder?.children || []) {
      if (!child.path.endsWith('.md')) continue
      const source = await this.app.vault.read(child)
      const match = source.match(/^remoteAlbumId:\s*"([^"]+)"$/m)
      if (match) existing.set(match[1], { file: child, source })
    }

    const wanted = new Set()
    for (const album of albums) {
      if (!album?.id) continue
      const content = galleryMirrorContent(album)
      const current = existing.get(album.id)
      let file = current?.file
      if (!file) {
        const target = normalizePath(`${folderPath}/${mirrorFileName(album)}`)
        file = await this.app.vault.create(target, content)
      } else if (current.source !== content) {
        await this.app.vault.modify(file, content)
      }
      wanted.add(file.path)
    }

    for (const current of existing.values()) {
      if (!wanted.has(current.file.path)) await this.app.vault.delete(current.file)
    }
  }

  async createNote(type, title) {
    const config = CONTENT_TYPES[type]
    const fileName = safeFileName(title)
    if (!fileName) throw new Error('标题无法用作文件名')

    const templatePath = normalizePath(`Blog/templates/${config.template}`)
    const template = await this.app.vault.adapter.read(templatePath)
    const content = fillFrontmatter(template, title)

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
