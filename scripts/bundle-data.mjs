import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })

const POSTS_DS_ID = process.env.NOTION_DB_POSTS || '6bff5b12-623c-4404-9e80-66c4b77f82eb'
const FOOD_DS_ID = process.env.NOTION_DB_FOOD || '3806b772-5d3c-8046-88b8-000b3b624968'
const GALLERY_DS_ID = process.env.NOTION_DB_GALLERY || '64bd6b1e-26f0-4994-9c11-1232e3590807'
const ABOUT_PAGE_ID = process.env.NOTION_PAGE_ID_ABOUT || '3806b772-5d3c-800a-ad82-f36e01605957'
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

async function fetchImageMeta(imageUrl) {
  if (!imageUrl.includes('guanyan.me')) return { width: 1200, height: 800 }
  try {
    const response = await fetch(`${imageUrl}!/meta`)
    if (response.ok) {
      const data = await response.json()
      if (Number(data.width) && Number(data.height)) return { width: Number(data.width), height: Number(data.height) }
    }
  } catch (error) { console.warn(`  Image metadata unavailable: ${error.message}`) }
  return { width: 1200, height: 800 }
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
  if (!posts.length) throw new Error('Notion returned no published posts; previous bundle was preserved')

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
    const images = []
    for (const src of sources) images.push({ src, ...await fetchImageMeta(src) })
    gallery.push({ slug: uniqueSlug(richText(props.Slug) || richText(props.slug), galleryTitle, page.id, gallerySlugs), title: galleryTitle, date: date(props.Date), category: select(props.Category) || richText(props.Category) || '日常', cover, images, excerpt: richText(props.Excerpt), published: true, content })
  }
  gallery.sort((a, b) => b.date.localeCompare(a.date))

  let about = ''
  try { about = await markdown(ABOUT_PAGE_ID) } catch (error) { console.warn(`  About fell back to content/about.md: ${error.message}`) }
  if (!about) about = fs.readFileSync(path.join(process.cwd(), 'content/about.md'), 'utf8')
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
