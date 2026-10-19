import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'

const DEFAULT_CATEGORY = '未分类'
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
const WIKI_EMBED_PATTERN = /!\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\((<[^>]+>|[^)"\n]+?)(?:\s+"[^"]*")?\)/g

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

function encodePathSegments(value) {
  return value.split('/').map((segment) => encodeURIComponent(segment)).join('/')
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

async function locateAttachment({ target, filePath, blogRoot, attachmentRoots, attachmentBaseUrl }) {
  const candidateRoots = [path.dirname(filePath), blogRoot, ...attachmentRoots.map((root) => path.join(blogRoot, root))]

  for (const root of candidateRoots) {
    const candidate = path.resolve(root, target)
    if (!(await exists(candidate))) continue
    const relative = path.relative(blogRoot, candidate)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`${path.basename(filePath)}: 附件 "${target}" 不在 Blog 发布区内，请移动到 Blog/attachments`)
    }
    if (!attachmentBaseUrl) {
      throw new Error(`${path.basename(filePath)}: 附件 "${relative}" 需要设置 attachmentBaseUrl 才能生成发布 URL`)
    }
    return `${attachmentBaseUrl.replace(/\/+$/, '')}/${encodePathSegments(relative)}`
  }

  throw new Error(`${path.basename(filePath)}: 找不到附件 "${target}"`)
}

function attachmentPath(target, filePath, blogRoot, attachmentRoots) {
  const roots = [path.dirname(filePath), blogRoot, ...attachmentRoots.map((root) => path.join(blogRoot, root))]
  for (const root of roots) {
    const candidate = path.resolve(root, target)
    const relative = path.relative(blogRoot, candidate)
    if (!relative.startsWith('..') && !path.isAbsolute(relative) && fsSync.existsSync(candidate)) return candidate
  }
  return null
}

async function convertLinks({ content, filePath, blogRoot, attachmentRoots, attachmentBaseUrl, slugByTitle }) {
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
    .filter(({ target }) => !/^(?:https?:|data:|\/)/i.test(target))
  for (const { source, alt, target } of replacements) {
    if (target.startsWith('<') && target.endsWith('>')) continue
    const url = await locateAttachment({
      target: decodeURIComponent(target),
      filePath,
      blogRoot,
      attachmentRoots,
      attachmentBaseUrl,
    })
    converted = converted.replace(source, `![${alt}](${markdownTarget(url)})`)
  }

  converted = converted.replace(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (_, rawTarget, alias = '') => {
    const target = rawTarget.trim()
    const label = alias.trim() || target
    const slug = slugByTitle.get(target) || cleanSlug(target)
    return `[${label}](/posts/${encodePostSlug(slug)})`
  })

  return converted
}

async function resolveCover(cover, { filePath, blogRoot, attachmentRoots, attachmentBaseUrl }) {
  if (!cover || /^(?:https?:|data:|\/)/i.test(cover)) return cover
  return locateAttachment({ target: cover, filePath, blogRoot, attachmentRoots, attachmentBaseUrl })
}

export async function loadObsidianPosts({
  blogRoot,
  attachmentBaseUrl = '',
  attachmentRoots = ['attachments'],
} = {}) {
  if (!blogRoot) throw new Error('blogRoot is required')
  const postsRoot = path.join(blogRoot, 'posts')
  let entries
  try {
    entries = await fs.readdir(postsRoot, { withFileTypes: true })
  } catch (error) {
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
    if (!title) throw new Error(`${path.basename(filePath)}: title 不能为空`)
    const slug = uniqueSlug(data.slug, path.basename(filePath, '.md'), slugs)
    titles.set(title, slug)
    titles.set(path.basename(filePath, '.md'), slug)
    if (data.published !== true) continue

    parsed.push({
      filePath,
      fileName: path.basename(filePath),
      slug,
      title,
      date: normalizeDate(normalizeDateOnly(data.date), path.basename(filePath)),
      category: scalar(data.category) || DEFAULT_CATEGORY,
      tags: stringList(data.tags),
      excerpt: scalar(data.excerpt),
      cover: scalar(data.cover),
      body: source.slice(match[0].length).trim(),
    })
  }

  const posts = []
  for (const post of parsed) {
    const content = await convertLinks({
      content: post.body,
      filePath: post.filePath,
      blogRoot,
      attachmentRoots,
      attachmentBaseUrl,
      slugByTitle: titles,
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
    posts.push(result)
  }

  posts.sort((left, right) => right.date.localeCompare(left.date) || left.slug.localeCompare(right.slug))
  return posts
}

export async function copyPublishedAttachments({
  blogRoot,
  posts,
  destinationRoot,
  sourceFiles = new Map(),
  attachmentRoots = ['attachments'],
} = {}) {
  if (!blogRoot || !posts || !destinationRoot) throw new Error('blogRoot, posts and destinationRoot are required')
  const copied = new Map()
  for (const post of posts) {
    const sourceFile = post.sourceFile || sourceFiles.get(post.slug) || path.join(blogRoot, 'posts', `${post.slug}.md`)
    const source = await fs.readFile(sourceFile, 'utf8')
    const frontmatter = source.match(FRONTMATTER_PATTERN)
    const body = frontmatter ? source.slice(frontmatter[0].length) : source
    const data = frontmatter ? YAML.parse(frontmatter[1]) || {} : {}
    const targets = []
    for (const match of body.matchAll(WIKI_EMBED_PATTERN)) targets.push(match[1])
    for (const match of body.matchAll(MARKDOWN_IMAGE_PATTERN)) {
      if (!/^(?:https?:|data:|\/)/i.test(match[2])) targets.push(match[2])
    }
    const cover = scalar(data.cover)
    if (cover && !/^(?:https?:|data:|\/)/i.test(cover)) targets.push(cover)
    for (const rawTarget of targets) {
      const target = rawTarget.trim()
      if (!target || /^(?:https?:|data:|\/)/i.test(target)) continue
      const candidate = attachmentPath(target, sourceFile, blogRoot, attachmentRoots)
        || attachmentPath(target, blogRoot, blogRoot, attachmentRoots)
      if (!candidate || !(await exists(candidate))) continue
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
  return `/**\n * Auto-generated by scripts/obsidian-preview.mjs. Do not edit manually.\n */\nexport const bundleData = ${JSON.stringify(bundle, null, 2)};\n`
}

export function parseBundle(source) {
  const marker = 'export const bundleData = '
  const index = source.indexOf(marker)
  if (index === -1) throw new Error('bundleData export not found')
  return JSON.parse(source.slice(index + marker.length).trim().replace(/;$/, ''))
}
