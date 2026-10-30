const {
  ItemView,
  Modal,
  Notice,
  Plugin,
  Setting,
  normalizePath,
  requestUrl,
  setIcon,
} = require('obsidian')

const GALLERY_API_ORIGIN = 'https://img.215320.xyz'
const GALLERY_PUBLIC_ORIGIN = 'https://guanyan.me/gallery'
const BLOG_HUB_VIEW = 'blog-publishing-hub'

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
      text: '输入相册上传令牌。令牌只保存在当前 Obsidian 会话内，不写入 Vault 或同步数据。',
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
        this.plugin.sessionToken = token
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
    const response = await requestUrl({
      url: `${GALLERY_API_ORIGIN}${path}`,
      method,
      headers: { Authorization: `Bearer ${token}` },
      throw: false,
    })
    if (response.status < 200 || response.status >= 300) {
      if (response.status === 401) this.plugin.sessionToken = ''
      throw new Error(responseError(response, `请求失败（HTTP ${response.status}）`))
    }
    return response.json
  }

  async loadAlbums(message = '正在读取相册…') {
    if (this.loading) return
    this.loading = true
    try {
      const response = await this.request('/internal/gallery/albums')
      this.renderAlbums(response.albums || [], message === '正在读取相册…' ? '' : message)
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
    logout.addEventListener('click', () => {
      this.plugin.sessionToken = ''
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

class BlogHubView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf)
    this.plugin = plugin
  }

  getViewType() {
    return BLOG_HUB_VIEW
  }

  getDisplayText() {
    return '发布管理'
  }

  getIcon() {
    return 'layout-dashboard'
  }

  async onOpen() {
    this.render()
  }

  render() {
    const { contentEl } = this
    contentEl.empty()
    contentEl.addClass('blog-hub-view')
    contentEl.createEl('h2', { text: '发布管理' })
    contentEl.createEl('p', {
      text: '选择要创建的内容类型，或管理 iPhone 上传的线上相册。',
      cls: 'setting-item-description',
    })

    const list = contentEl.createDiv({ cls: 'blog-hub-list' })
    const items = [
      ...Object.entries(CONTENT_TYPES).map(([type, config]) => ({
        title: `新建${config.label}`,
        description: `在 Blog/${config.folder}/ 创建新${config.label}`,
        icon: config.icon,
        action: () => this.plugin.openCreate(type),
      })),
      {
        title: '管理线上相册',
        description: '查看、打开或删除快捷指令上传的相册',
        icon: 'images',
        action: () => this.plugin.openGalleryManager(),
        manage: true,
      },
    ]

    for (const item of items) {
      const button = list.createEl('button', {
        cls: `blog-hub-item${item.manage ? ' is-manage' : ''}`,
        attr: { type: 'button' },
      })
      const icon = button.createSpan({ cls: 'blog-hub-item-icon' })
      setIcon(icon, item.icon)
      const copy = button.createSpan({ cls: 'blog-hub-item-copy' })
      copy.createEl('strong', { text: item.title })
      copy.createEl('span', { text: item.description })
      const arrow = button.createSpan({ cls: 'blog-hub-item-arrow' })
      setIcon(arrow, 'chevron-right')
      button.addEventListener('click', item.action)
    }

    const actions = contentEl.createDiv({ cls: 'blog-hub-links' })
    const website = actions.createEl('button', { text: '打开网站', attr: { type: 'button' } })
    website.addEventListener('click', () => openExternal('https://guanyan.me'))
    const gallery = actions.createEl('button', { text: '打开线上相册', attr: { type: 'button' } })
    gallery.addEventListener('click', () => openExternal(GALLERY_PUBLIC_ORIGIN))
  }

  async onClose() {
    this.contentEl.empty()
  }
}

module.exports = class BlogCreatePlugin extends Plugin {
  async onload() {
    this.sessionToken = ''
    this.registerView(BLOG_HUB_VIEW, (leaf) => new BlogHubView(leaf, this))

    this.addRibbonIcon('layout-dashboard', '打开发布管理', () => {
      this.activateHubView()
    })

    this.addCommand({
      id: 'open-publishing-hub',
      name: '打开发布管理',
      callback: () => this.activateHubView(),
    })
    this.addCommand({
      id: 'manage-gallery-albums',
      name: '管理线上相册',
      callback: () => this.openGalleryManager(),
    })

    for (const [type, config] of Object.entries(CONTENT_TYPES)) {
      this.addCommand({
        id: `new-${type}`,
        name: `新建${config.label}`,
        callback: () => this.openCreate(type),
      })
    }
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(BLOG_HUB_VIEW)
  }

  async activateHubView() {
    let leaf = this.app.workspace.getLeavesOfType(BLOG_HUB_VIEW)[0]
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false)
      if (!leaf) return
      await leaf.setViewState({ type: BLOG_HUB_VIEW, active: true })
    }
    await this.app.workspace.revealLeaf(leaf)
  }

  openCreate(type) {
    new TitleModal(this.app, type, (title) => this.createNote(type, title)).open()
  }

  openGalleryManager() {
    new GalleryManagerModal(this.app, this).open()
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
