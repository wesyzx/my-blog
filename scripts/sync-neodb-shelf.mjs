import fs from 'node:fs/promises'
import path from 'node:path'

try {
  const { default: dotenv } = await import('dotenv')
  dotenv.config({ path: '.env.local', quiet: true })
} catch {
  // dotenv is optional; CI passes NEODB_TOKEN through the environment.
}

const API_BASE = 'https://neodb.social/api'
const SITE_BASE = 'https://neodb.social'
const USER_AGENT = 'my-blog-shelf/1.0 (+https://guanyan.me/shelf)'
const DEFAULT_IMAGE_URL = '/shelf'
const DEFAULT_IMAGE_DIR = 'public/shelf'
const DEFAULT_OUTPUT = 'content/shelf.json'

function arg(name, fallback = '') {
  const prefix = `--${name}=`
  const found = process.argv.slice(2).find((value) => value.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

function flag(name) {
  return process.argv.includes(`--${name}`)
}

function list(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const options = {
  token: arg('token') || process.env.NEODB_TOKEN || '',
  categories: list(arg('categories', 'book,movie,tv,music')),
  shelves: list(arg('shelf', 'complete,progress')),
  subjects: list(arg('subjects')),
  limit: Number.parseInt(arg('limit', '0'), 10) || 0,
  delay: Number.parseInt(arg('delay', '300'), 10) || 0,
  output: arg('out', DEFAULT_OUTPUT),
  imageDir: arg('images', DEFAULT_IMAGE_DIR),
  imageUrl: arg('image-url', DEFAULT_IMAGE_URL).replace(/\/$/, ''),
  force: flag('force'),
  noImages: flag('no-images'),
  merge: flag('merge'),
  replace: flag('replace'),
  includeHidden: flag('include-hidden'),
  prune: flag('prune'),
}

const SHELF_STATUS = {
  complete: 'done',
  progress: 'doing',
  wishlist: 'mark',
  dropped: 'done',
}

const PALETTES = [
  { bg: '#4c3131', band: '#724a4a' },
  { bg: '#7a5a2e', band: '#9a7439' },
  { bg: '#3f4a4f', band: '#5c6a70' },
  { bg: '#2f3f5a', band: '#41536f' },
  { bg: '#6b3a4a', band: '#8a4f60' },
  { bg: '#3d5a4c', band: '#54735f' },
  { bg: '#5a4b6b', band: '#746289' },
  { bg: '#5c5148', band: '#7a6a5d' },
  { bg: '#2e4a5a', band: '#3f6274' },
  { bg: '#6a4a3a', band: '#8a6350' },
  { bg: '#474747', band: '#666666' },
  { bg: '#6d5b2f', band: '#8d7a44' },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const CJK = /[\u3400-\u9fff]/

const parentCache = new Map()

async function loadParent(item) {
  if (item.category !== 'tv' || !item.parent_uuid) return null
  if (!parentCache.has(item.parent_uuid)) {
    try {
      const parent = await requestJson(`${API_BASE}/tv/${item.parent_uuid}`)
      parentCache.set(item.parent_uuid, parent)
    } catch {
      parentCache.set(item.parent_uuid, null)
    }
  }
  return parentCache.get(item.parent_uuid)
}

async function requestJson(url, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
      })
      if (response.status === 401) throw new Error(`HTTP 401 未授权，请检查 NEODB_TOKEN (${url})`)
      if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`)
      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt < attempts) await sleep(1000 * attempt)
    }
  }
  throw lastError
}

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function trimSummary(text, max = 180) {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const cut = Math.max(...['。', '！', '？', '…', '；'].map((mark) => slice.lastIndexOf(mark)))
  if (cut >= max * 0.55) return slice.slice(0, cut + 1)
  return `${slice.slice(0, max - 1).trimEnd()}…`
}

function luminance(hex) {
  const value = String(hex || '').replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return 0
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
  const linear = channels.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function hashIndex(value, size) {
  let hash = 0
  for (const char of String(value)) hash = (hash * 31 + char.codePointAt(0)) % 1000003
  return hash % size
}

function mapColors(seed) {
  const palette = PALETTES[hashIndex(seed, PALETTES.length)]
  return {
    bg: palette.bg,
    fg: luminance(palette.bg) > 0.55 ? '#1a1814' : '#f4f1ea',
    band: palette.band,
    bandFg: luminance(palette.band) > 0.55 ? '#1a1814' : '#f4f1ea',
    paper: '#f5f2ec',
    paperFg: '#1a1814',
    isDark: luminance(palette.bg) <= 0.55,
  }
}

function pickTitle(item, parent) {
  const localized = (target) =>
    (target?.localized_title || [])
      .filter((label) => ['zh-cn', 'zh-hk', 'zh-tw'].includes(String(label.lang).toLowerCase()))
      .map((label) => cleanText(label.text))
      .filter(Boolean)
  const candidates = [
    item.title,
    ...localized(item),
    parent?.title,
    ...localized(parent),
    item.display_title,
    parent?.display_title,
  ]
    .map((value) => cleanText(value))
    .filter(Boolean)
  return candidates.find((value) => CJK.test(value)) || candidates[0] || ''
}

function creatorOf(item, parent) {
  const credits = Array.isArray(item.credits) ? item.credits : []
  const role = item.category === 'music'
    ? 'artist'
    : ['movie', 'tv'].includes(item.category)
      ? 'director'
      : 'author'
  const fromCredits = credits.filter((credit) => credit.role === role).map((credit) => cleanText(credit.name)).filter(Boolean)
  const direct = (item.artist ?? item.director ?? item.author ?? parent?.director ?? [])
    .map((name) => cleanText(name))
    .filter(Boolean)
  const groups = [fromCredits, direct]
  for (const group of groups) {
    const chinese = group.filter((name) => CJK.test(name))
    if (chinese.length) return chinese.join(' / ')
  }
  for (const group of groups) {
    if (group.length) return group.join(' / ')
  }
  return credits.slice(0, 2).map((credit) => cleanText(credit.name)).filter(Boolean).join(' / ')
}

function minutesOf(item) {
  const raw = item.duration ?? item.length
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const match = String(raw || '').match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : null
}

const KIND_OF_CATEGORY = {
  book: 'book',
  movie: 'movie',
  tv: 'tv',
  music: 'music',
}

function toItem(item, mark, parent) {
  const kind = KIND_OF_CATEGORY[item.category] || 'movie'
  const url = item.url?.startsWith('http') ? item.url : `${SITE_BASE}${item.url || ''}`
  const summary = cleanText(item.description || item.brief || '')
  const year = String(item.pub_year || item.year || item.release_date || parent?.pub_year || parent?.year || '').slice(0, 4)

  return {
    id: String(item.uuid),
    kind,
    source: 'neodb',
    title: pickTitle(item, parent),
    creator: creatorOf(item, parent),
    year: /^\d{4}$/.test(year) ? year : '',
    cover: `${options.imageUrl}/${item.uuid}.jpg`,
    coverSource: item.cover_image_url || '',
    aspect: kind === 'music' ? 1 : 2 / 3,
    colors: mapColors(item.uuid),
    doubanRating: typeof item.rating === 'number' ? item.rating : null,
    ratingCount: item.rating_count ?? 0,
    summary: trimSummary(summary),
    url,
    pages: Number.isInteger(item.pages) ? item.pages : null,
    minutes: kind === 'movie' || kind === 'music' ? minutesOf(item) : null,
    myRating: mark?.rating_grade ?? null,
    comment: cleanText(mark?.comment_text),
    status: mark?.shelf_type ? SHELF_STATUS[mark.shelf_type] || 'done' : 'done',
    date: mark?.created_time ? String(mark.created_time).slice(0, 10) : '',
  }
}

async function collectShelf() {
  if (!options.token) throw new Error('缺少 NEODB_TOKEN，请在 .env.local 或环境变量中配置')
  const entries = []
  const seen = new Set()
  let hidden = 0

  for (const shelf of options.shelves) {
    for (const category of options.categories) {
      let page = 1
      let pages = 1
      do {
        const url = `${API_BASE}/me/shelf/${shelf}?category=${encodeURIComponent(category)}&page=${page}&page_size=50`
        const data = await requestJson(url)
        pages = data.pages || 1
        for (const mark of data.data || []) {
          const item = mark.item
          if (!item?.uuid || seen.has(item.uuid)) continue
          if (!options.includeHidden && mark.visibility != null && Number(mark.visibility) !== 0) {
            hidden += 1
            continue
          }
          seen.add(item.uuid)
          entries.push({ item, mark })
          if (options.limit && entries.length >= options.limit) {
            console.log(`命中 --limit=${options.limit}，提前结束`)
            return { entries, hidden }
          }
        }
        page += 1
        if (page <= pages && options.delay) await sleep(options.delay)
      } while (page <= pages)
      if (options.delay) await sleep(options.delay)
    }
  }

  entries.sort((a, b) => String(b.mark?.created_time || '').localeCompare(String(a.mark?.created_time || '')))
  return { entries, hidden }
}

async function collectSubjects() {
  const entries = []
  for (const spec of options.subjects) {
    const [category, uuid] = spec.split(':')
    if (!category || !uuid) throw new Error(`无效的 --subjects 条目 "${spec}"，格式应为 book:uuid`)
    const item = await requestJson(`${API_BASE}/${category}/${uuid}`)
    entries.push({ item, mark: null })
    if (options.delay) await sleep(options.delay)
  }
  return { entries, hidden: 0 }
}

async function downloadCover(item, index, total) {
  if (options.noImages) return
  if (!item.coverSource) {
    console.warn(`[${index + 1}/${total}] 缺少封面，跳过 ${item.title}`)
    return
  }
  const destination = path.join(options.imageDir, `${item.id}.jpg`)
  if (!options.force) {
    try {
      await fs.access(destination)
      return
    } catch {
      // Download below.
    }
  }

  const response = await fetch(item.coverSource, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`cover HTTP ${response.status} ${item.coverSource}`)
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) throw new Error(`cover is not an image: ${contentType}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(destination, buffer)
  console.log(`[${index + 1}/${total}] 封面 ${destination} (${buffer.length} bytes)`)
}

async function main() {
  const { entries, hidden } = options.subjects.length ? await collectSubjects() : await collectShelf()
  if (!entries.length) throw new Error('没有取到任何 NeoDB 条目（书架为空，或全部标记为非公开；可加 --include-hidden 试试）')
  if (hidden) console.log(`已跳过 ${hidden} 条非公开标记（需要的话加 --include-hidden）`)

  let existing = null
  if (options.merge && !options.replace) {
    try {
      const parsed = JSON.parse(await fs.readFile(options.output, 'utf8'))
      if (Array.isArray(parsed.items)) existing = parsed
    } catch {
      existing = null
    }
  }

  await fs.mkdir(options.imageDir, { recursive: true })
  const items = options.replace ? [] : existing ? [...existing.items] : []
  const indexById = new Map(items.map((item, index) => [item.id, index]))
  let added = 0
  let updated = 0

  for (let index = 0; index < entries.length; index += 1) {
    const { item: source, mark } = entries[index]
    const parent = await loadParent(source)
    const item = toItem(source, mark, parent)
    await downloadCover(item, index, entries.length)
    const known = indexById.get(item.id)
    if (known === undefined) {
      indexById.set(item.id, items.length)
      items.push(item)
      added += 1
    } else {
      items[known] = { ...items[known], ...item }
      updated += 1
    }
  }

  const payload = {
    syncedAt: new Date().toISOString(),
    source: 'neodb',
    items,
  }
  await fs.mkdir(path.dirname(options.output), { recursive: true })
  await fs.writeFile(options.output, `${JSON.stringify(payload, null, 2)}\n`)

  if (options.prune && !options.noImages) {
    const used = new Set(items.map((item) => `${item.id}.jpg`))
    let pruned = 0
    for (const file of await fs.readdir(options.imageDir)) {
      if (!file.endsWith('.jpg') || used.has(file)) continue
      await fs.rm(path.join(options.imageDir, file))
      pruned += 1
    }
    if (pruned) console.log(`清理未引用封面 ${pruned} 个`)
  }

  const count = (kind) => items.filter((item) => item.kind === kind).length
  console.log(
    `NeoDB 同步完成：新增 ${added}，更新 ${updated}，共 ${items.length} 条` +
      `（书 ${count('book')} / 影 ${count('movie')} / 剧 ${count('tv')} / 乐 ${count('music')}）-> ${options.output}`,
  )
}

main().catch((error) => {
  console.error(`NeoDB 同步失败：${error.message}`)
  process.exit(1)
})
