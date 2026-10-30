import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { gcj02ToWgs84 } from '../lib/geo.mjs'
import { readImageSize } from '../lib/image-size.mjs'
import { blogImageInfoUrl, isBlogImage } from '../lib/blog-images.mjs'
import { loadObsidianContent, mirrorPublishedAttachments, parseBundle, serializeBundle } from '../lib/obsidian-content.mjs'

dotenv.config({ path: '.env.local' })

const POSTS_DS_ID = process.env.NOTION_DB_POSTS || '6bff5b12-623c-4404-9e80-66c4b77f82eb'
const FOOD_DS_ID = process.env.NOTION_DB_FOOD || '3806b772-5d3c-8046-88b8-000b3b624968'
const GALLERY_DS_ID = process.env.NOTION_DB_GALLERY || '64bd6b1e-26f0-4994-9c11-1232e3590807'
let repositoryContentSources = {}
try {
  repositoryContentSources = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/source.json'), 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const CONTENT_SOURCES = Object.fromEntries(['posts', 'food', 'gallery'].map((section) => {
  const override = section === 'posts' ? process.env.CONTENT_SOURCE : process.env[`${section.toUpperCase()}_CONTENT_SOURCE`]
  return [section, (override || repositoryContentSources[section] || 'notion').trim().toLowerCase()]
}))
const OBSIDIAN_BLOG_DIR = process.env.OBSIDIAN_BLOG_DIR || path.join(process.cwd(), 'content/obsidian')
const GALLERY_MANIFEST_URL = process.env.GALLERY_MANIFEST_URL || 'https://img.215320.xyz/webp/gallery-manifest'

// 「是否发布」勾选列可能用的名字。博文 / 相册 / 美食共用这一份，避免三处写法不一致。
const PUBLISH_KEYS = ['Published', 'published', '发布', '是否发布', '是否已发布']
const OUTPUT_PATH = path.join(process.cwd(), 'lib/data-bundle.ts')

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const n2m = new NotionToMarkdown({ notionClient: notion })
const title = (property) => property?.title?.[0]?.plain_text || ''
const richText = (property) => property?.rich_text?.[0]?.plain_text || ''
const date = (property) => property?.date?.start || ''
const checkbox = (property) => property?.checkbox === true
const url = (property) => property?.url || ''
const number = (property) => property?.number || 0
const select = (property) => property?.select?.name || ''
const multiSelect = (property) => property?.multi_select?.map((item) => item.name) || []

function property(properties, names) {
  return names.map((name) => properties?.[name]).find((value) => value !== undefined) || null
}

function loadExistingBundle() {
  try {
    const source = fs.readFileSync(OUTPUT_PATH, 'utf8')
    return parseBundle(source)
  } catch {
    return { posts: [], food: [], gallery: [], about: '' }
  }
}

/** 已提交的快照里是否有可用内容。有内容就允许在同步失败时继续用旧版本，避免整站构建失败。 */
function hasUsableSnapshot(bundle) {
  return ['posts', 'food', 'gallery'].some((key) => Array.isArray(bundle[key]) && bundle[key].length > 0)
}

function reportNotionFailure(error, snapshotAvailable) {
  const reason = process.env.NOTION_TOKEN
    ? `请求失败：${error.message}`
    : '未配置 NOTION_TOKEN —— 部署环境需要单独配置该变量'
  const bar = '='.repeat(64)
  const lines = [
    '',
    `  ${bar}`,
    '  ! Notion 同步失败 —— 本次构建将沿用上一版内容快照',
    `  ! 原因: ${reason}`,
    '  ! 修复: 在部署环境配置有效的 NOTION_TOKEN，并确认构建机可访问 api.notion.com',
    '  ! 需要让构建直接失败可设置 CONTENT_STRICT=1',
    `  ${bar}`,
    '',
  ]
  if (process.env.CONTENT_STRICT === '1') throw new Error(`Notion 同步失败（CONTENT_STRICT=1）：${reason}`)
  if (!snapshotAvailable) throw new Error(`Notion 同步失败且没有可复用的内容快照：${reason}`)
  console.warn(lines.join('\n'))
}

async function queryAll(dataSourceId) {
  const results = []
  let cursor
  do {
    const response = await notion.dataSources.query({ data_source_id: dataSourceId, start_cursor: cursor, page_size: 100 })
    results.push(...response.results)
    cursor = response.has_more ? response.next_cursor || undefined : undefined
  } while (cursor)
  return results
}

async function markdown(pageId) {
  const blocks = await n2m.pageToMarkdown(pageId)
  return n2m.toMarkdownString(blocks).parent || ''
}

function cleanSlug(value) {
  return String(value || '').trim().replace(/\s+/g, '-').replace(/[/?#%]+/g, '-').replace(/^-+|-+$/g, '')
}

function uniqueSlug(preferred, fallback, pageId, used) {
  const candidates = [preferred, fallback, `${fallback}-${pageId.slice(0, 8)}`].map(cleanSlug).filter(Boolean)
  const slug = candidates.find((candidate) => !used.has(candidate))
  if (!slug) throw new Error(`Unable to generate a unique slug for page ${pageId}`)
  if (slug !== cleanSlug(preferred)) console.warn(`  Resolved duplicate or empty slug as "${slug}"`)
  used.add(slug)
  return slug
}

function imageLinks(content) {
  return Array.from(content.matchAll(/!\[.*?\]\((https?:\/\/.*?)\)/g), (match) => match[1])
}


async function fetchImageMeta(imageUrl, lastKnown) {
  const ownedImage = isBlogImage(imageUrl)
  if (!ownedImage && !imageUrl.includes('guanyan.me')) return lastKnown || { width: 1200, height: 800 }
  try {
    if (ownedImage) {
      try {
        // R2 source dimensions, without encoding/downloading a full WebP merely
        // to lay out an album. The endpoint may not be deployed yet.
        const metadata = await fetch(blogImageInfoUrl(imageUrl), { signal: AbortSignal.timeout(8000) })
        if (metadata.ok) {
          const size = await metadata.json()
          if (Number.isInteger(size.width) && size.width > 0 && Number.isInteger(size.height) && size.height > 0) {
            return { width: size.width, height: size.height }
          }
        }
      } catch { /* Fall back to the established header probe during rollout. */ }
    }
    // 尺寸信息在文件头里，只取前 64KB 即可，不必下载整张图。
    // 注意：不要带图片处理参数，处理后的图会丢失原始尺寸与元数据。
    const response = await fetch(imageUrl, {
      headers: { Range: 'bytes=0-65535', Accept: 'image/webp,image/*;q=0.8' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok && response.status !== 206) throw new Error(`HTTP ${response.status}`)
    const size = readImageSize(Buffer.from(await response.arrayBuffer()))
    if (size?.width && size?.height) return size
    throw new Error('无法从文件头解析出尺寸')
  } catch (error) {
    // 抓不到时优先沿用上一版快照里这个 URL 的真实尺寸，
    // 否则一次网络抖动就会把已经量到的尺寸冲掉，退回错误的 1200x800。
    if (lastKnown) {
      console.warn(`  Image size unavailable, reusing last known ${lastKnown.width}x${lastKnown.height}: ${imageUrl} (${error.message})`)
      return lastKnown
    }
    console.warn(`  Image size unavailable, falling back to 1200x800: ${imageUrl} (${error.message})`)
    return { width: 1200, height: 800 }
  }
}

function cleanText(value, maximum) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maximum)
    : ''
}

async function fetchR2Gallery(existing, reservedSlugs = new Set()) {
  try {
    const manifestUrl = new URL(GALLERY_MANIFEST_URL)
    manifestUrl.searchParams.set('_', String(Date.now()))
    const response = await fetch(manifestUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const manifest = await response.json()
    if (!Array.isArray(manifest?.albums)) throw new Error('相册清单缺少 albums')
    const used = new Set(reservedSlugs)
    return manifest.albums.slice(0, 1000).flatMap((album) => {
      if (!album || typeof album.title !== 'string' || !Array.isArray(album.images)) return []
      const images = album.images.slice(0, 100).flatMap((image) => {
        if (!isBlogImage(image?.src)) return []
        const width = Number(image.width)
        const height = Number(image.height)
        if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) return []
        return [{ src: image.src, width, height }]
      })
      if (!images.length) return []
      const title = cleanText(album.title, 120)
      if (!title) return []
      const albumDate = /^\d{4}-\d{2}-\d{2}$/.test(album.date)
        ? album.date
        : new Date().toISOString().slice(0, 10)
      const slug = uniqueSlug(album.slug, title, album.id || `${albumDate}-${title}`, used)
      return [{
        slug,
        title,
        date: albumDate,
        category: cleanText(album.category, 40) || '日常',
        cover: images[0].src,
        images,
        excerpt: cleanText(album.excerpt, 500),
        published: true,
        content: images.map((image, index) => `![${title} ${index + 1}](${image.src})`).join('\n\n'),
        source: 'r2',
      }]
    }).sort((left, right) => right.date.localeCompare(left.date) || left.slug.localeCompare(right.slug))
  } catch (error) {
    console.warn(`  R2 gallery manifest unavailable; using the previous shortcut albums: ${error.message}`)
    return (existing.gallery || [])
      .filter((album) => album.source === 'r2')
      .map((album) => ({ ...album, source: 'r2' }))
  }
}

async function geocode(address) {
  if (!address || !process.env.AMAP_KEY) return { lng: 0, lat: 0 }
  const cleanAddress = address.replace(/\(.*?\)|（.*?）/g, '').trim()
  const response = await fetch(`https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(cleanAddress)}&key=${process.env.AMAP_KEY}`)
  if (!response.ok) return { lng: 0, lat: 0 }
  const data = await response.json()
  if (data.status !== '1' || !data.geocodes?.[0]?.location) return { lng: 0, lat: 0 }
  const [gcjLng, gcjLat] = data.geocodes[0].location.split(',').map(Number)
  const [lng, lat] = gcj02ToWgs84(gcjLng, gcjLat)
  return { lng, lat }
}

async function fetchNotionContent(existing, previousCoords, previousImageSizes, {
  includePosts = true, includeFood = true, includeGallery = true,
} = {}) {
  const posts = []
  if (includePosts) {
    const postPages = await queryAll(POSTS_DS_ID)
    postPages.sort((left, right) => date(right.properties?.Date).localeCompare(date(left.properties?.Date)) || left.id.localeCompare(right.id))
    const postSlugs = new Set()
    let missingPublishFlag = 0
    for (const page of postPages) {
      const props = page.properties
      const publishFlag = property(props, PUBLISH_KEYS)
      // 勾选列找不到时按「不发布」处理：宁可少发几篇，也不能把草稿误发到线上。
      if (!publishFlag) { missingPublishFlag += 1; continue }
      if (!checkbox(publishFlag)) continue
      const postTitle = title(props.Name)
      if (!postTitle) continue
      posts.push({ slug: uniqueSlug(richText(props.Slug), postTitle, page.id, postSlugs), title: postTitle, date: date(props.Date), category: select(props.Category) || richText(props.Category) || '未分类', tags: multiSelect(props.Tags), excerpt: richText(props.Excerpt), cover: url(props.Cover), published: true, content: await markdown(page.id) })
    }
    posts.sort((a, b) => b.date.localeCompare(a.date))

    if (missingPublishFlag) {
      console.warn([
        '',
        '  ' + '='.repeat(64),
        `  ! 有 ${missingPublishFlag} 条记录找不到「发布」勾选列，已全部按未发布处理`,
        `  ! 请检查 Notion 里这一列的名字，支持：${PUBLISH_KEYS.join(' / ')}`,
        '  ' + '='.repeat(64),
        '',
      ].join('\n'))
    }

    const previousPosts = existing.posts || []
    const allowEmpty = process.env.CONTENT_ALLOW_EMPTY === '1'
    // 「空」分两种，必须区别对待，否则勾选框就管不住发布：
    //   Notion 一条都没返回 / 勾选列整个不见了 → 更像故障或配置错误 → 沿用旧快照
    //   Notion 有记录但全都没勾选            → 是明确的意图       → 尊重它，线上就是空的
    const looksLikeFailure = postPages.length === 0 || missingPublishFlag === postPages.length
    if (!posts.length && previousPosts.length && !allowEmpty && looksLikeFailure) {
      console.warn([
        '',
        '  ' + '='.repeat(64),
        `  ! ${postPages.length === 0 ? 'Notion 没有返回任何博文记录' : '找不到「发布」勾选列'}，继续沿用上一版快照里的 ${previousPosts.length} 篇`,
        '  ! 确实要清空线上文章，请用 CONTENT_ALLOW_EMPTY=1 重新构建',
        '  ' + '='.repeat(64),
        '',
      ].join('\n'))
      posts.push(...previousPosts)
    } else if (!posts.length && !looksLikeFailure) {
      console.warn('\n  ! 所有博文都取消了「发布」勾选，本次构建的博文列表为空（这是预期结果）。\n')
    } else if (!posts.length) {
      console.warn('\n  ! Notion 当前没有任何已发布文章，本次构建的博文列表为空。\n')
    }
  }

  const foodPages = includeFood ? await queryAll(FOOD_DS_ID) : []
  const foodSlugs = new Set()
  const food = []
  for (const page of foodPages) {
    const props = page.properties
    const published = property(props, PUBLISH_KEYS)
    if (published && !checkbox(published)) continue
    const foodTitle = title(property(props, ['Name', '名称', 'data ']))
    if (!foodTitle) continue
    const slug = uniqueSlug(richText(property(props, ['Slug', 'slug'])), foodTitle, page.id, foodSlugs)
    const content = await markdown(page.id)
    const location = richText(property(props, ['Location', 'location', '地点', '商户名称'])) || foodTitle
    const address = richText(property(props, ['Address', 'address', '地址'])) || location
    let lng = number(property(props, ['Lng', 'lng', '经度']))
    let lat = number(property(props, ['Lat', 'lat', '纬度']))
    if (!lng || !lat) ({ lng, lat } = previousCoords.get(slug) || await geocode(location || address))
    const cover = url(property(props, ['Cover', 'cover', '封面', '封面图']))
    const images = imageLinks(content)
    if (!images.length && cover) images.push(cover)
    const tagsProperty = property(props, ['Tags', 'tags', '标签'])
    const tags = tagsProperty?.type === 'multi_select' ? multiSelect(tagsProperty) : richText(tagsProperty).split(/[\s,，;；]+/).filter(Boolean)
    food.push({ slug, title: foodTitle, date: date(property(props, ['Date', 'date', '日期'])), location, address, lng, lat, cover, images, tags, excerpt: richText(property(props, ['Excerpt', 'excerpt', '摘要'])), published: true, content })
  }
  food.sort((a, b) => b.date.localeCompare(a.date))

  const galleryPages = includeGallery ? await queryAll(GALLERY_DS_ID) : []
  const gallerySlugs = new Set()
  const gallery = []
  for (const page of galleryPages) {
    const props = page.properties
    const publishFlag = property(props, PUBLISH_KEYS)
    if (publishFlag && !checkbox(publishFlag)) continue
    const galleryTitle = title(props.Name)
    if (!galleryTitle) continue
    const content = await markdown(page.id)
    const sources = imageLinks(content)
    const cover = url(props.Cover)
    if (!sources.length && cover) sources.push(cover)
    const images = await Promise.all(sources.map(async (src) => ({ src, ...await fetchImageMeta(src, previousImageSizes.get(src)) })))
    gallery.push({ slug: uniqueSlug(richText(props.Slug) || richText(props.slug), galleryTitle, page.id, gallerySlugs), title: galleryTitle, date: date(props.Date), category: select(props.Category) || richText(props.Category) || '日常', cover, images, excerpt: richText(props.Excerpt), published: true, content })
  }
  gallery.sort((a, b) => b.date.localeCompare(a.date))

  return { posts, food, gallery }
}

async function buildBundle() {
  if (Object.values(CONTENT_SOURCES).some((source) => !['notion', 'obsidian', 'r2', 'hybrid'].includes(source))) {
    throw new Error('内容源只能是 notion、obsidian、r2 或 hybrid')
  }
  if (CONTENT_SOURCES.posts === 'r2' || CONTENT_SOURCES.food === 'r2'
    || CONTENT_SOURCES.posts === 'hybrid' || CONTENT_SOURCES.food === 'hybrid') {
    throw new Error('r2 与 hybrid 目前只支持相册板块')
  }
  console.log(`Bundling content: ${JSON.stringify(CONTENT_SOURCES)}...`)
  const existing = loadExistingBundle()
  const snapshotAvailable = hasUsableSnapshot(existing)
  const previousCoords = new Map((existing.food || []).filter((item) => item.slug && item.lng && item.lat).map((item) => [item.slug, { lng: item.lng, lat: item.lat }]))
  // 上一版快照里各张图已量到的尺寸，抓取失败时用来兜底，避免退回错误的 1200x800
  const previousImageSizes = new Map(
    (existing.gallery || []).flatMap((album) => (album.images || []).filter((image) => image.src && image.width && image.height).map((image) => [image.src, { width: image.width, height: image.height }])),
  )

  const selected = { posts: [], food: [], gallery: [] }
  const notionSections = Object.keys(selected).filter((section) => CONTENT_SOURCES[section] === 'notion')
  if (notionSections.length) {
    let remote
    try {
      if (!process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN is missing')
      remote = await fetchNotionContent(existing, previousCoords, previousImageSizes, {
        includePosts: notionSections.includes('posts'),
        includeFood: notionSections.includes('food'),
        includeGallery: notionSections.includes('gallery'),
      })
    } catch (error) {
      reportNotionFailure(error, snapshotAvailable)
      remote = existing
    }
    for (const section of notionSections) selected[section] = remote[section] || []
  }
  const obsidianSections = Object.keys(selected).filter((section) =>
    CONTENT_SOURCES[section] === 'obsidian'
    || (section === 'gallery' && CONTENT_SOURCES[section] === 'hybrid'))
  if (obsidianSections.length) {
    const blogDirectory = path.resolve(OBSIDIAN_BLOG_DIR)
    const local = await loadObsidianContent({
      blogRoot: blogDirectory,
      sections: obsidianSections,
      attachmentBaseUrl: process.env.OBSIDIAN_ATTACHMENT_BASE_URL || '/obsidian',
      attachmentRoots: ['attachments'],
      previousImageSizes,
    })
    for (const section of obsidianSections) {
      if (!local[section].length && existing[section]?.length && process.env.CONTENT_ALLOW_EMPTY !== '1') {
        throw new Error(`Obsidian ${section} 发布区没有已发布文章或条目。若确实要清空，请设置 CONTENT_ALLOW_EMPTY=1`)
      }
      selected[section] = local[section]
    }
    if (CONTENT_SOURCES.gallery === 'obsidian' || CONTENT_SOURCES.gallery === 'hybrid') {
      await Promise.all(selected.gallery.flatMap((album) => album.images.map(async (image) => {
        if (isBlogImage(image.src)) {
          Object.assign(image, await fetchImageMeta(image.src, previousImageSizes.get(image.src) || image))
        }
      })))
    }
    for (const item of selected.food) {
      if (CONTENT_SOURCES.food === 'obsidian' && !item.lng && !item.lat) {
        Object.assign(item, previousCoords.get(item.slug) || await geocode(item.location || item.address))
      }
    }
    await mirrorPublishedAttachments({
      blogRoot: blogDirectory,
      posts: obsidianSections.flatMap((section) => local[section]),
      destinationRoot: path.join(process.cwd(), 'public/obsidian'),
      attachmentRoots: ['attachments'],
    })
  }
  if (CONTENT_SOURCES.gallery === 'r2' || CONTENT_SOURCES.gallery === 'hybrid') {
    const obsidianSlugs = new Set(selected.gallery.map((album) => album.slug).filter(Boolean))
    const remoteGallery = await fetchR2Gallery(existing, obsidianSlugs)
    selected.gallery = CONTENT_SOURCES.gallery === 'hybrid'
      ? [...selected.gallery, ...remoteGallery]
        .sort((left, right) => right.date.localeCompare(left.date) || left.slug.localeCompare(right.slug))
      : remoteGallery
  }
  const { posts, food, gallery } = selected

  // 关于页只认本地 content/about.md，避免 Notion 页面权限变化影响构建。
  const about = fs.readFileSync(path.join(process.cwd(), 'content/about.md'), 'utf8')
  const bundle = { posts, food, gallery, about, updatedAt: new Date().toISOString() }
  const output = serializeBundle(bundle)
  const tempPath = `${OUTPUT_PATH}.tmp`
  fs.writeFileSync(tempPath, output)
  fs.renameSync(tempPath, OUTPUT_PATH)
  console.log(`Bundled ${posts.length} posts, ${food.length} food entries and ${gallery.length} albums.`)
}

buildBundle().catch((error) => { console.error(`Content bundling failed: ${error.message}`); process.exit(1) })
