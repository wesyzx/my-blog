import fs from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { readImageSize } from './image-size.mjs'
import {
  attachmentCandidates,
  decodeAttachmentTarget,
  localAttachmentTargets,
  MARKDOWN_IMAGE_PATTERN,
  HTML_VIDEO_PATTERN,
  WIKI_EMBED_PATTERN,
} from './obsidian-attachments.mjs'

const DEFAULT_CATEGORY = '未分类'
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

function cleanSlug(value) {
  return String(value || '').trim().replace(/\s+/g, '-').replace(/[/?#%]+/g, '-').replace(/^-+|-+$/g, '')
}

function uniqueSlug(preferred, fallback, used) {
  const base = cleanSlug(preferred) || cleanSlug(fallback)
  if (!base) throw new Error('Unable to generate a slug')
  let slug = base
  let suffix = 2
  while (used.has(slug)) slug = `${base}-${suffix++}`
  if (slug !== base) console.warn(`  Resolved duplicate slug as "${slug}"`)
  used.add(slug)
  return slug
}

function scalar(value) {
  return String(value ?? '').trim()
}

function stringList(value) {
  if (Array.isArray(value)) return value.map(scalar).filter(Boolean)
  if (typeof value === 'string') return value.split(/[\s,，;；]+/).map(scalar).filter(Boolean)
  return []
}

function normalizeDate(value, file) {
  const input = value instanceof Date ? value.toISOString().slice(0, 10) : scalar(value)
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(input) ? new Date(`${input}T00:00:00Z`) : null
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input) {
    throw new Error(`${file}: date 必须是 YYYY-MM-DD`)
  }
  return input
}

function normalizeDateOnly(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const input = scalar(value)
  const match = input.match(/^(\d{4}-\d{2}-\d{2})(?:T|\s|$)/)
  return match?.[1] || input
}

function encodePostSlug(value) {
  return value.split('/').map((segment) => encodeURIComponent(segment)).join('/')
}

function markdownTarget(value) {
  return /[\s()]/.test(value) ? `<${value}>` : value
}

async function exists(target) {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

function normalizeAttachmentTarget(value, blogRoot) {
  let target = String(value).trim()
  if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1)
  if (target.startsWith(`${path.basename(blogRoot)}/`)) target = target.slice(path.basename(blogRoot).length + 1)
  return target
}

async function attachmentPath(targetValue, filePath, blogRoot, attachmentRoots) {
  const target = normalizeAttachmentTarget(targetValue, blogRoot)
  const realRoot = await fs.realpath(blogRoot)
  const candidates = attachmentCandidates(target, path.relative(blogRoot, filePath).split(path.sep).join('/'), attachmentRoots)
  if (!candidates.length) throw new Error(`${path.basename(filePath)}: 附件不在 Blog 发布区内的 attachments 目录`)
  for (const relative of candidates) {
    const candidate = path.join(blogRoot, relative)
    if (!(await exists(candidate))) continue
    const realCandidate = await fs.realpath(candidate)
    const realRelative = path.relative(realRoot, realCandidate)
    if (!attachmentRoots.some((root) => realRelative.startsWith(`${root}${path.sep}`))) {
      throw new Error(`${path.basename(filePath)}: 附件 "${target}" 不在 Blog 发布区内，请移动到 Blog/attachments`)
    }
    if (!(await fs.stat(candidate)).isFile()) throw new Error('An attachment must be a regular file')
    return candidate
  }
  throw new Error(`${path.basename(filePath)}: 找不到附件 "${target}"`)
}

async function locateAttachment({ target, filePath, blogRoot, attachmentRoots, attachmentBaseUrl }) {
  const candidate = await attachmentPath(target, filePath, blogRoot, attachmentRoots)
  const relative = path.relative(blogRoot, candidate)
  if (!attachmentBaseUrl) {
    throw new Error(`${path.basename(filePath)}: 附件 "${relative}" 需要设置 attachmentBaseUrl 才能生成发布 URL`)
  }
  return `${attachmentBaseUrl.replace(/\/+$/, '')}/${encodePostSlug(relative)}`
}

async function convertLinks({ content, filePath, blogRoot, attachmentRoots, attachmentBaseUrl, slugByTitle, section }) {
  let converted = content.replace(WIKI_EMBED_PATTERN, (_, rawTarget, alias = '') => {
    const target = rawTarget.trim()
    if (/^https?:\/\//i.test(target)) {
      return `![${alias.trim() || path.basename(target)}](${markdownTarget(target)})`
    }
    const placement = `__OBSIDIAN_ATTACHMENT_${target}__`
    return `{{${placement}|${alias.trim()}}}`
  })

  for (const match of [...converted.matchAll(/\{\{__OBSIDIAN_ATTACHMENT_(.+?)__\|(.*?)\}\}/g)]) {
    const [, target, alias] = match
    const url = await locateAttachment({
      target,
      filePath,
      blogRoot,
      attachmentRoots,
      attachmentBaseUrl,
    })
    converted = converted.replace(match[0], `![${alias || path.basename(target)}](${markdownTarget(url)})`)
  }

  const replacements = [...converted.matchAll(MARKDOWN_IMAGE_PATTERN)]
    .map((match) => ({ source: match[0], alt: match[1], target: match[2] }))
    .filter(({ target }) => !/^(?:https?:|data:|\/)/i.test(target.replace(/^<|>$/g, '')))
  for (const { source, alt, target } of replacements) {
    const url = await locateAttachment({
      target: decodeAttachmentTarget(target.replace(/^<|>$/g, '')),
      filePath,
      blogRoot,
      attachmentRoots,
      attachmentBaseUrl,
    })
    converted = converted.replace(source, `![${alt}](${markdownTarget(url)})`)
  }
  for (const match of [...converted.matchAll(HTML_VIDEO_PATTERN)]) {
    const target = match[1]
    if (/^(?:https?:|data:|\/)/i.test(target)) continue
    const url = await locateAttachment({
      target: decodeAttachmentTarget(target), filePath, blogRoot, attachmentRoots, attachmentBaseUrl,
    })
    converted = converted.replace(match[0], match[0].replace(target, url))
  }

  converted = converted.replace(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (_, rawTarget, alias = '') => {
    const target = rawTarget.trim()
    const label = alias.trim() || target
    const slug = slugByTitle.get(target) || cleanSlug(target)
    return `[${label}](/${section}/${encodePostSlug(slug)})`
  })

  return converted
}

async function resolveCover(cover, { filePath, blogRoot, attachmentRoots, attachmentBaseUrl }) {
  if (!cover || /^(?:https?:|data:|\/)/i.test(cover)) return cover
  return locateAttachment({ target: decodeAttachmentTarget(cover), filePath, blogRoot, attachmentRoots, attachmentBaseUrl })
}

export async function loadObsidianPosts({
  blogRoot,
  attachmentBaseUrl = '',
  attachmentRoots = ['attachments'],
  section = 'posts',
  optional = section !== 'posts',
} = {}) {
  if (!blogRoot) throw new Error('blogRoot is required')
  if (!['posts', 'food', 'gallery'].includes(section)) throw new Error('Unsupported content section')
  const postsRoot = path.join(blogRoot, section)
  let entries
  try {
    entries = await fs.readdir(postsRoot, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT' && optional) return []
    if (error.code === 'ENOENT') throw new Error(`${path.basename(postsRoot)} 目录不存在，请检查 OBSIDIAN_BLOG_DIR 是否指向 Blog 发布区`)
    throw error
  }
  const postFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(postsRoot, entry.name))
    .sort()

  const parsed = []
  const titles = new Map()
  const slugs = new Set()
  for (const filePath of postFiles) {
    const source = await fs.readFile(filePath, 'utf8')
    const match = source.match(FRONTMATTER_PATTERN)
    if (!match) throw new Error(`${path.basename(filePath)}: 缺少 YAML frontmatter`)
    let data
    try {
      data = YAML.parse(match[1]) || {}
    } catch (error) {
      throw new Error(`${path.basename(filePath)}: frontmatter 解析失败：${error.message}`)
    }
    const title = scalar(data.title)
    // 草稿允许先不填标题；已填写标题的草稿仍参与链接映射，避免双链跳错。
    if (!title) {
      if (data.published === true) throw new Error(`${path.basename(filePath)}: title 不能为空`)
      continue
    }
    if (data.published !== true) {
      const draftSlug = cleanSlug(data.slug) || cleanSlug(path.basename(filePath, '.md'))
      if (!titles.has(title)) titles.set(title, draftSlug)
      continue
    }
    const slug = uniqueSlug(data.slug, path.basename(filePath, '.md'), slugs)

    parsed.push({
      filePath,
      fileName: path.basename(filePath),
      data,
      slug,
      title,
      date: normalizeDate(normalizeDateOnly(data.date), path.basename(filePath)),
      category: scalar(data.category) || (section === 'gallery' ? '日常' : DEFAULT_CATEGORY),
      tags: stringList(data.tags),
      excerpt: scalar(data.excerpt),
      cover: scalar(data.cover),
      body: source.slice(match[0].length).trim(),
    })
  }

  const posts = []
  for (const post of parsed) {
    titles.set(post.title, post.slug)
    titles.set(path.basename(post.filePath, '.md'), post.slug)
  }
  for (const post of parsed) {
    const content = await convertLinks({
      content: post.body,
      filePath: post.filePath,
      blogRoot,
      attachmentRoots,
      attachmentBaseUrl,
      slugByTitle: titles,
      section,
    })
    const result = {
      slug: post.slug,
      title: post.title,
      date: post.date,
      category: post.category,
      tags: post.tags,
      excerpt: post.excerpt,
      cover: await resolveCover(post.cover, { filePath: post.filePath, blogRoot, attachmentRoots, attachmentBaseUrl }),
      published: true,
      content,
    }
    Object.defineProperty(result, 'sourceFile', {
      value: post.filePath,
      enumerable: false,
    })
    Object.defineProperty(result, 'sourceData', { value: post.data })
    posts.push(result)
  }

  posts.sort((left, right) => right.date.localeCompare(left.date) || left.slug.localeCompare(right.slug))
  return posts
}

function declaredImages(data) {
  if (data.images === undefined) return []
  if (!Array.isArray(data.images)) throw new Error('images 必须是图片地址列表')
  return data.images.map((image) => {
    const value = typeof image === 'string' ? { src: image } : image
    if (!value || typeof value.src !== 'string' || !value.src.trim()) throw new Error('images 中的图片地址不能为空')
    return { ...value, src: value.src.trim() }
  })
}

async function collectionImages(post, options) {
  const images = []
  const seen = new Set()
  const managed = post.sourceData.managedBy === 'blog-create-vault-gallery'
  const metadata = new Map((Array.isArray(post.sourceData.mediaMetadata) ? post.sourceData.mediaMetadata : [])
    .filter((item) => item && typeof item.src === 'string').map((item) => [item.src, item]))
  const declarations = managed ? [] : declaredImages(post.sourceData)
  const embeds = [
    ...[...post.content.matchAll(MARKDOWN_IMAGE_PATTERN)].map((match) => ({ index: match.index, src: match[2].replace(/^<|>$/g, '') })),
    ...[...post.content.matchAll(HTML_VIDEO_PATTERN)].map((match) => ({ index: match.index, src: match[1], kind: 'video' })),
  ].sort((a, b) => a.index - b.index)
  for (const embed of embeds) {
    declarations.push({ ...metadata.get(embed.src), ...embed, converted: true })
  }
  if (!managed && !declarations.length && post.cover) declarations.push({ src: post.cover, converted: true })
  for (const image of declarations) {
    const src = image.converted ? image.src : await resolveCover(image.src, {
      ...options, filePath: post.sourceFile,
    })
    if (seen.has(src)) continue
    seen.add(src)
    const configured = Number(image.width) > 0 && Number(image.height) > 0
      ? { width: Number(image.width), height: Number(image.height) } : null
    const base = `${options.attachmentBaseUrl.replace(/\/+$/, '')}/`
    let dimensions
    const video = image.kind === 'video' || /\.(mp4|mov|m4v|webm|ogv)(?:[?#]|$)/i.test(src)
    if (!video && src.startsWith(base)) {
      const filePath = await attachmentPath(decodeAttachmentTarget(src.slice(base.length)), post.sourceFile, options.blogRoot, options.attachmentRoots)
      const handle = await fs.open(filePath, 'r')
      try {
        const header = Buffer.alloc(65536)
        const { bytesRead } = await handle.read(header, 0, header.length, 0)
        dimensions = readImageSize(header.subarray(0, bytesRead))
      } finally {
        await handle.close()
      }
    }
    images.push({
      src, ...(dimensions || configured || options.previousImageSizes?.get(src) || (video ? { width: 1920, height: 1080 } : { width: 1200, height: 800 })),
      ...(video ? {
        kind: 'video',
        ...(Number(image.duration) > 0 ? { duration: Number(image.duration) } : {}),
        ...(typeof image.poster === 'string' && image.poster ? { poster: image.poster } : {}),
        ...(typeof image.mimeType === 'string' && image.mimeType ? { mimeType: image.mimeType } : {}),
      } : {}),
    })
  }
  return images
}

function foodCoordinates(data) {
  const present = (value) => value !== undefined && value !== null && value !== ''
  if (present(data.lng) !== present(data.lat)) throw new Error('美食坐标需要同时填写 lng 和 lat')
  const lng = present(data.lng) ? Number(data.lng) : 0
  const lat = present(data.lat) ? Number(data.lat) : 0
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    throw new Error('美食坐标超出有效范围')
  }
  return { lng, lat }
}

export async function loadObsidianContent({
  sections = ['posts', 'food', 'gallery'],
  attachmentBaseUrl = '/obsidian',
  attachmentRoots = ['attachments'],
  ...options
} = {}) {
  const resolved = { ...options, attachmentBaseUrl, attachmentRoots }
  const content = { posts: [], food: [], gallery: [] }
  for (const section of sections) {
    const entries = await loadObsidianPosts({ ...resolved, section })
    if (section === 'posts') {
      content.posts = entries
      continue
    }
    for (const entry of entries) {
      const images = await collectionImages(entry, resolved)
      // An empty managed note stays in the approved source snapshot, but has no public album.
      const managed = entry.sourceData.managedBy === 'blog-create-vault-gallery'
      const shared = { slug: entry.slug, title: entry.title, date: entry.date,
        cover: managed
          ? (images.some((image) => image.src === entry.cover) ? entry.cover : images.find((image) => image.kind !== 'video')?.src || '')
          : entry.cover || images.find((image) => image.kind !== 'video')?.src || '',
        excerpt: entry.excerpt, published: true, content: entry.content }
      const item = section === 'food'
        ? { ...shared, location: scalar(entry.sourceData.location) || entry.title,
          address: scalar(entry.sourceData.address) || scalar(entry.sourceData.location) || entry.title,
          ...foodCoordinates(entry.sourceData), tags: entry.tags, images: images.map((image) => image.src) }
        : { ...shared, category: entry.category, images,
          ...(entry.sourceData.remoteAlbumId ? { albumId: scalar(entry.sourceData.remoteAlbumId), source: 'obsidian' } : {}),
          ...(Array.isArray(entry.sourceData.aliases) ? { aliases: entry.sourceData.aliases.filter((alias) => typeof alias === 'string' && alias !== entry.slug && !/[\\/?#%\u0000-\u001f]/.test(alias)) } : {}),
        }
      Object.defineProperty(item, 'sourceFile', { value: entry.sourceFile })
      content[section].push(item)
    }
  }
  return content
}

export async function copyPublishedAttachments({
  blogRoot,
  posts,
  destinationRoot,
  attachmentRoots = ['attachments'],
} = {}) {
  if (!blogRoot || !posts || !destinationRoot) throw new Error('blogRoot, posts and destinationRoot are required')
  const copied = new Map()
  for (const post of posts) {
    const sourceFile = post.sourceFile
    if (!sourceFile) throw new Error('Missing source file metadata for published content')
    const source = await fs.readFile(sourceFile, 'utf8')
    const frontmatter = source.match(FRONTMATTER_PATTERN)
    const body = frontmatter ? source.slice(frontmatter[0].length) : source
    const data = frontmatter ? YAML.parse(frontmatter[1]) || {} : {}
    for (const target of localAttachmentTargets(body, data)) {
      const candidate = await attachmentPath(target, sourceFile, blogRoot, attachmentRoots)
      const source = candidate
      const relative = path.relative(blogRoot, source)
      const destination = path.join(destinationRoot, relative)
      if (!copied.has(relative)) {
        await fs.mkdir(path.dirname(destination), { recursive: true })
        await fs.copyFile(source, destination)
        copied.set(relative, destination)
      }
    }
  }
  return [...copied.keys()]
}

export async function mirrorPublishedAttachments({
  blogRoot,
  posts,
  destinationRoot,
  attachmentRoots = ['attachments'],
} = {}) {
  const destination = path.resolve(destinationRoot)
  await fs.mkdir(destination, { recursive: true })
  const copied = await copyPublishedAttachments({ blogRoot, posts, destinationRoot: destination, attachmentRoots })
  const keep = new Set(copied)
  async function prune(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name)
      const relative = path.relative(destination, target).split(path.sep).join('/')
      if (entry.isDirectory()) {
        await prune(target)
        if ((await fs.readdir(target)).length === 0) await fs.rmdir(target)
      } else if (!keep.has(relative)) {
        await fs.rm(target)
      }
    }
  }
  await prune(destination)
  return copied
}

export function serializeBundle(bundle) {
  return `/**\n * Auto-generated content snapshot. Do not edit manually.\n */\nexport const bundleData = ${JSON.stringify(bundle, null, 2)};\n`
}

export function parseBundle(source) {
  const marker = 'export const bundleData = '
  const index = source.indexOf(marker)
  if (index === -1) throw new Error('bundleData export not found')
  return JSON.parse(source.slice(index + marker.length).trim().replace(/;$/, ''))
}
