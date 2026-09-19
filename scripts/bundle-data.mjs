import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })

const POSTS_DS_ID = process.env.NOTION_DB_POSTS || '6bff5b12-623c-4404-9e80-66c4b77f82eb'
const FOOD_DS_ID = process.env.NOTION_DB_FOOD || '3806b772-5d3c-8046-88b8-000b3b624968'
const GALLERY_DS_ID = process.env.NOTION_DB_GALLERY || '64bd6b1e-26f0-4994-9c11-1232e3590807'
const OUTPUT_PATH = path.join(process.cwd(), 'lib/data-bundle.ts')

if (!process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN is missing')

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
    const json = source.slice(source.indexOf('export const bundleData = ') + 'export const bundleData = '.length).trim().replace(/;$/, '')
    return JSON.parse(json)
  } catch {
    return { posts: [], food: [], gallery: [], says: [], about: '' }
  }
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

/** 从图片文件头解析尺寸，支持 JPEG / PNG / WebP / GIF */
function readImageSize(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  // PNG：8 字节签名后紧跟 IHDR
  if (buffer.length > 24 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { width: view.getUint32(16), height: view.getUint32(20) }
  }

  // GIF
  if (buffer.length > 10 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) }
  }

  // WebP（RIFF 容器，三种子格式）
  if (buffer.length > 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const format = buffer.toString('ascii', 12, 16)
    if (format === 'VP8X') return { width: (view.getUint32(24, true) & 0xffffff) + 1, height: (view.getUint32(27, true) & 0xffffff) + 1 }
    if (format === 'VP8 ') return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
    if (format === 'VP8L') {
      const bits = view.getUint32(21, true)
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }
  }

  // JPEG：逐段扫描，找到 SOFn 帧头
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue }
      const marker = buffer[offset + 1]
      if (marker === 0xff) { offset += 1; continue }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue }
      const segmentLength = view.getUint16(offset + 2)
      const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      if (isFrameHeader) return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) }
      offset += 2 + segmentLength
    }
  }

  return null
}

async function fetchImageMeta(imageUrl) {
  if (!imageUrl.includes('guanyan.me')) return { width: 1200, height: 800 }
  try {
    // 尺寸信息在文件头里，只取前 64KB 即可，不必下载整张图。
    // 注意：不要带图片处理参数，处理后的图会丢失原始尺寸与元数据。
    const response = await fetch(imageUrl, { headers: { Range: 'bytes=0-65535' } })
    if (!response.ok && response.status !== 206) throw new Error(`HTTP ${response.status}`)
    const size = readImageSize(Buffer.from(await response.arrayBuffer()))
    if (size?.width && size?.height) return size
    throw new Error('无法从文件头解析出尺寸')
  } catch (error) {
    console.warn(`  Image size unavailable, falling back to 1200x800: ${imageUrl} (${error.message})`)
    return { width: 1200, height: 800 }
  }
}

const PI = Math.PI
const AXIS = 6378245
const ECCENTRICITY = 0.006693421622965943
function transformLat(x, y) { return -100 + 2*x + 3*y + .2*y*y + .1*x*y + .2*Math.sqrt(Math.abs(x)) + (20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3 + (20*Math.sin(y*PI)+40*Math.sin(y/3*PI))*2/3 + (160*Math.sin(y/12*PI)+320*Math.sin(y*PI/30))*2/3 }
function transformLng(x, y) { return 300 + x + 2*y + .1*x*x + .1*x*y + .1*Math.sqrt(Math.abs(x)) + (20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3 + (20*Math.sin(x*PI)+40*Math.sin(x/3*PI))*2/3 + (150*Math.sin(x/12*PI)+300*Math.sin(x/30*PI))*2/3 }
function gcj02ToWgs84(lng, lat) {
  if (lng < 72.004 || lng > 137.8347 || lat < .8293 || lat > 55.8271) return [lng, lat]
  let dLat = transformLat(lng - 105, lat - 35)
  let dLng = transformLng(lng - 105, lat - 35)
  const radLat = lat / 180 * PI
  let magic = 1 - ECCENTRICITY * Math.sin(radLat) ** 2
  const sqrtMagic = Math.sqrt(magic)
  dLat = dLat * 180 / ((AXIS * (1 - ECCENTRICITY)) / (magic * sqrtMagic) * PI)
  dLng = dLng * 180 / (AXIS / sqrtMagic * Math.cos(radLat) * PI)
  return [lng * 2 - (lng + dLng), lat * 2 - (lat + dLat)]
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

const MEMOS_BASE_URL = process.env.MEMOS_BASE_URL || 'https://memos.guanyan.me'
const MEMOS_PROXY_PREFIX = '/api/memos/file'

function toProxyUrl(url) {
  if (!url) return ''
  const match = String(url).match(/^https?:\/\/memos\.guanyan\.me\/file\/(.+)$/)
  return match ? `${MEMOS_PROXY_PREFIX}/${match[1]}` : url
}

function memoAttachmentUrl(attachment) {
  if (attachment.externalLink) return attachment.externalLink
  const id = attachment.name ? attachment.name.split('/').pop() : attachment.id
  return id && attachment.filename ? `${MEMOS_PROXY_PREFIX}/attachments/${id}/${attachment.filename}` : ''
}

function parseMemos(data) {
  return (data.memos || []).filter((memo) => memo.state === 'NORMAL').map((memo) => {
    // Memos v0.25 起把 memo.resources 改名为 memo.attachments，两种字段都兼容
    const attachments = memo.attachments || memo.resources || []
    const fromAttachments = attachments.filter((item) => !item.type || item.type.startsWith('image/')).map(memoAttachmentUrl).filter(Boolean)
    const images = Array.from(new Set([...fromAttachments, ...imageLinks(memo.content || '').map(toProxyUrl)]))
    return { slug: memo.name?.split('/').pop() || memo.uid || memo.id, date: memo.createTime || memo.displayTime || '', content: (memo.content || '').replace(/!\[.*?\]\((.*?)\)/g, '').trim(), image: images[0], images }
  }).filter((memo) => memo.slug)
}

function reportMemosFailure(error, existingSays) {
  const reason = process.env.MEMOS_TOKEN
    ? `请求失败：${error.message}`
    : '未配置 MEMOS_TOKEN —— 请求以匿名身份发出，Memos 会直接返回 401'
  const bar = '='.repeat(64)
  console.warn([
    '',
    `  ${bar}`,
    '  ! Memos 同步失败 —— 短记页面将继续沿用旧快照，内容不会更新',
    `  ! 原因: ${reason}`,
    '  ! 修复: 在 .env.local 与部署环境配置有效的 MEMOS_TOKEN',
    `  ! 自检: curl -H "Authorization: Bearer $MEMOS_TOKEN" "${MEMOS_BASE_URL}/api/v1/memos?pageSize=2"`,
    '  ! 需要让构建直接失败可设置 MEMOS_STRICT=1',
    `  ${bar}`,
    '',
  ].join('\n'))
  if (process.env.MEMOS_STRICT === '1') throw new Error(`Memos 同步失败（MEMOS_STRICT=1）：${reason}`)
  return existingSays
}

async function fetchSays(existingSays) {
  try {
    if (!process.env.MEMOS_TOKEN) throw new Error('MEMOS_TOKEN 未设置')
    const headers = { Accept: 'application/json', Authorization: `Bearer ${process.env.MEMOS_TOKEN}` }
    const endpoint = process.env.MEMOS_API_URL || `${MEMOS_BASE_URL}/api/v1/memos`
    const response = await fetch(`${endpoint}?pageSize=20`, { headers })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const says = parseMemos(await response.json())
    return says.length ? says : existingSays
  } catch (error) {
    return reportMemosFailure(error, existingSays)
  }
}

async function buildBundle() {
  console.log('Bundling content from Notion and Memos...')
  const existing = loadExistingBundle()
  const previousCoords = new Map((existing.food || []).filter((item) => item.slug && item.lng && item.lat).map((item) => [item.slug, { lng: item.lng, lat: item.lat }]))

  const postPages = await queryAll(POSTS_DS_ID)
  postPages.sort((left, right) => date(right.properties?.Date).localeCompare(date(left.properties?.Date)) || left.id.localeCompare(right.id))
  const postSlugs = new Set()
  const posts = []
  for (const page of postPages) {
    const props = page.properties
    if (props.Published && !checkbox(props.Published)) continue
    const postTitle = title(props.Name)
    if (!postTitle) continue
    posts.push({ slug: uniqueSlug(richText(props.Slug), postTitle, page.id, postSlugs), title: postTitle, date: date(props.Date), category: select(props.Category) || richText(props.Category) || '未分类', tags: multiSelect(props.Tags), excerpt: richText(props.Excerpt), cover: url(props.Cover), published: true, content: await markdown(page.id) })
  }
  posts.sort((a, b) => b.date.localeCompare(a.date))
  const previousPosts = existing.posts || []
  const allowEmpty = process.env.CONTENT_ALLOW_EMPTY === '1'
  if (!posts.length && previousPosts.length && !allowEmpty) {
    // Notion 返回空时默认沿用上一版快照，避免 Notion 抖动导致线上文章凭空消失。
    // 早期实现这里直接 throw，导致「保留了旧快照」这句话形同虚设 —— 构建照样失败、无法部署。
    // 确实要清空线上文章时，用 CONTENT_ALLOW_EMPTY=1 跑一次即可（清空后不再需要该开关）。
    console.warn([
      '',
      '  ' + '='.repeat(64),
      `  ! Notion 没有任何已发布文章，继续沿用上一版快照里的 ${previousPosts.length} 篇`,
      '  ! 确实要清空线上文章，请用 CONTENT_ALLOW_EMPTY=1 重新构建',
      '  ' + '='.repeat(64),
      '',
    ].join('\n'))
    posts.push(...previousPosts)
  } else if (!posts.length) {
    console.warn('\n  ! Notion 当前没有任何已发布文章，本次构建的博文列表为空。\n')
  }

  const foodPages = await queryAll(FOOD_DS_ID)
  const foodSlugs = new Set()
  const food = []
  for (const page of foodPages) {
    const props = page.properties
    const published = property(props, ['Published', 'published', '发布', '是否发布'])
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

  const galleryPages = await queryAll(GALLERY_DS_ID)
  const gallerySlugs = new Set()
  const gallery = []
  for (const page of galleryPages) {
    const props = page.properties
    if (props.Published && !checkbox(props.Published)) continue
    const galleryTitle = title(props.Name)
    if (!galleryTitle) continue
    const content = await markdown(page.id)
    const sources = imageLinks(content)
    const cover = url(props.Cover)
    if (!sources.length && cover) sources.push(cover)
    const images = await Promise.all(sources.map(async (src) => ({ src, ...await fetchImageMeta(src) })))
    gallery.push({ slug: uniqueSlug(richText(props.Slug) || richText(props.slug), galleryTitle, page.id, gallerySlugs), title: galleryTitle, date: date(props.Date), category: select(props.Category) || richText(props.Category) || '日常', cover, images, excerpt: richText(props.Excerpt), published: true, content })
  }
  gallery.sort((a, b) => b.date.localeCompare(a.date))

  // 关于页只认本地 content/about.md。
  // 早期会先读 Notion 页面，但那个页面早已失联，每次都在 catch 里静默回退到本地文件 ——
  // 白白制造了一个「在 Notion 改了却不生效」的陷阱，所以直接去掉这条路。
  const about = fs.readFileSync(path.join(process.cwd(), 'content/about.md'), 'utf8')
  const says = await fetchSays(existing.says || [])
  const bundle = { posts, food, gallery, says, about, updatedAt: new Date().toISOString() }
  const output = `/**\n * Auto-generated by scripts/bundle-data.mjs. Do not edit manually.\n */\nexport const bundleData = ${JSON.stringify(bundle, null, 2)};\n`
  const tempPath = `${OUTPUT_PATH}.tmp`
  fs.writeFileSync(tempPath, output)
  JSON.parse(output.slice(output.indexOf('export const bundleData = ') + 'export const bundleData = '.length).trim().replace(/;$/, ''))
  fs.renameSync(tempPath, OUTPUT_PATH)
  console.log(`Bundled ${posts.length} posts, ${food.length} food entries, ${gallery.length} albums and ${says.length} says.`)
}

buildBundle().catch((error) => { console.error(`Content bundling failed: ${error.message}`); process.exit(1) })
