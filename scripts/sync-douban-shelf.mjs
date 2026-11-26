import fs from 'node:fs/promises'
import path from 'node:path'

const API_BASE = 'https://m.douban.com/rexxar/api/v2'
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
const DEFAULT_IMAGE_URL = '/shelf-demo'
const DEFAULT_IMAGE_DIR = 'public/shelf-demo'
const DEFAULT_OUTPUT = 'content/shelf-demo.json'

function arg(name, fallback = '') {
  const prefix = `--${name}=`
  const found = process.argv.slice(2).find((value) => value.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

function flag(name) {
  return process.argv.includes(`--${name}`)
}

const options = {
  user: arg('user'),
  subjects: arg('subjects'),
  types: arg('types', 'book,movie').split(',').map((value) => value.trim()).filter(Boolean),
  statuses: arg('status', 'done').split(',').map((value) => value.trim()).filter(Boolean),
  limit: Number.parseInt(arg('limit', '0'), 10) || 0,
  delay: Number.parseInt(arg('delay', '1500'), 10) || 0,
  output: arg('out', DEFAULT_OUTPUT),
  imageDir: arg('images', DEFAULT_IMAGE_DIR),
  imageUrl: arg('image-url', DEFAULT_IMAGE_URL).replace(/\/$/, ''),
  force: flag('force'),
  noImages: flag('no-images'),
  merge: flag('merge'),
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function requestJson(url, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: 'https://m.douban.com/',
          Accept: 'application/json',
        },
      })
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
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function trimSummary(text, max = 180) {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const cut = Math.max(...['。', '！', '？', '…', '；'].map((mark) => slice.lastIndexOf(mark)))
  if (cut >= max * 0.55) return slice.slice(0, cut + 1)
  return `${slice.slice(0, max - 1).trimEnd()}…`
}

function parseMinutes(value) {
  const match = String(value || '').match(/(\d+)\s*分钟/)
  return match ? Number.parseInt(match[1], 10) : null
}

function luminance(hex) {
  const value = String(hex || '').replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return 0
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
  const linear = channels.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function normalizeHex(value, fallback) {
  const raw = String(value || '').replace('#', '')
  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toLowerCase()}` : fallback
}

function mapColors(scheme) {
  const source = scheme || {}
  const bg = normalizeHex(source.primary_color_dark || source.primary_color_light, '#2b2b2b')
  const band = normalizeHex(source.primary_color_light || source.primary_color_dark, '#555555')
  const paper = normalizeHex(source.secondary_color, '#f5f5f2')
  return {
    bg,
    fg: luminance(bg) > 0.55 ? '#1a1814' : '#f4f1ea',
    band,
    bandFg: luminance(band) > 0.55 ? '#1a1814' : '#f4f1ea',
    paper,
    paperFg: luminance(paper) > 0.55 ? '#1a1814' : '#f4f1ea',
    isDark: source.is_dark !== false,
  }
}

function toItem(subject, interest) {
  const kind = subject.type === 'movie' ? 'movie' : 'book'
  const creator = kind === 'book'
    ? (subject.author || []).join(' / ')
    : (subject.directors || []).map((person) => person.name).filter(Boolean).join(' / ')
  const year = kind === 'book'
    ? cleanText(subject.pubdate?.[0]).slice(0, 4)
    : cleanText(subject.year).slice(0, 4)
  const coverUrl = subject.cover_url || subject.pic?.large || ''
  const pages = kind === 'book' ? Number.parseInt(subject.pages?.[0], 10) || null : null
  const minutes = kind === 'movie' ? parseMinutes(subject.durations?.[0]) : null

  return {
    id: String(subject.id),
    kind,
    title: cleanText(subject.title),
    creator: cleanText(creator),
    year,
    cover: `${options.imageUrl}/${subject.id}.jpg`,
    coverSource: coverUrl,
    aspect: 2 / 3,
    colors: mapColors(subject.color_scheme),
    doubanRating: subject.rating?.value ?? null,
    ratingCount: subject.rating?.count ?? 0,
    summary: trimSummary(cleanText(subject.intro)),
    url: subject.url || '',
    pages,
    minutes,
    myRating: interest?.rating?.value ?? null,
    comment: cleanText(interest?.comment),
    status: interest?.status || 'done',
    date: cleanText(interest?.create_time).slice(0, 10),
  }
}

async function downloadCover(item, index, total) {
  if (options.noImages) return
  const destination = path.join(options.imageDir, `${item.id}.jpg`)
  if (!options.force) {
    try {
      await fs.access(destination)
      console.log(`[${index + 1}/${total}] cover exists ${destination}`)
      return
    } catch {
      // Download below.
    }
  }

  const referer = item.kind === 'book' ? 'https://book.douban.com/' : 'https://movie.douban.com/'
  const response = await fetch(item.coverSource, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: referer,
    },
  })
  if (!response.ok) throw new Error(`cover HTTP ${response.status} ${item.coverSource}`)
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) throw new Error(`cover is not an image: ${contentType}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(destination, buffer)
  console.log(`[${index + 1}/${total}] cover ${destination} (${buffer.length} bytes)`)
}

async function collectUser() {
  if (!options.user) throw new Error('Missing --user or --subjects')
  const entries = []
  const seen = new Set()

  for (const type of options.types) {
    for (const status of options.statuses) {
      let start = 0
      while (true) {
        const url = `${API_BASE}/user/${encodeURIComponent(options.user)}/interests?type=${type}&status=${status}&start=${start}&count=50`
        const data = await requestJson(url)
        const interests = data.interests || []
        for (const interest of interests) {
          const subject = interest.subject
          if (!subject || seen.has(String(subject.id))) continue
          seen.add(String(subject.id))
          entries.push({ subject, interest })
          if (options.limit && entries.length >= options.limit) return entries
        }
        if (interests.length < 50 || start + interests.length >= (data.total || 0)) break
        start += interests.length
        if (options.delay) await sleep(options.delay)
      }
      if (options.delay) await sleep(options.delay)
    }
  }

  return entries
}

async function collectSubjects() {
  const specs = options.subjects.split(',').map((value) => value.trim()).filter(Boolean)
  if (!specs.length) throw new Error('Missing --user or --subjects')
  const entries = []

  for (const spec of specs) {
    const [type, id] = spec.split(':')
    if (!['book', 'movie'].includes(type) || !id) {
      throw new Error(`Invalid subject "${spec}", expected book:123 or movie:456`)
    }
    const subject = await requestJson(`${API_BASE}/${type}/${id}`)
    entries.push({ subject, interest: null })
    if (options.delay) await sleep(options.delay)
  }

  return entries
}

async function main() {
  const entries = options.subjects ? await collectSubjects() : await collectUser()
  if (!entries.length) throw new Error('No Douban entries found')

  let existing = null
  if (options.merge) {
    try {
      const raw = await fs.readFile(options.output, 'utf8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.items)) existing = parsed
    } catch {
      existing = null
    }
  }

  await fs.mkdir(options.imageDir, { recursive: true })
  const items = existing ? [...existing.items] : []
  const known = new Set(items.map((item) => item.id))
  let added = 0

  for (let index = 0; index < entries.length; index += 1) {
    const { subject, interest } = entries[index]
    const item = toItem(subject, interest)
    if (known.has(item.id)) {
      console.log(`[${index + 1}/${entries.length}] skip ${item.title} (already in shelf)`)
      continue
    }
    await downloadCover(item, index, entries.length)
    items.push(item)
    known.add(item.id)
    added += 1
  }

  if (existing && added === 0) {
    console.log(`No new items. Kept ${items.length} existing items -> ${options.output}`)
    return
  }

  const payload = {
    syncedAt: new Date().toISOString(),
    source: existing?.source || 'douban',
    items,
  }
  await fs.mkdir(path.dirname(options.output), { recursive: true })
  await fs.writeFile(options.output, `${JSON.stringify(payload, null, 2)}\n`)
  const books = items.filter((item) => item.kind === 'book').length
  const movies = items.filter((item) => item.kind === 'movie').length
  const summary = existing
    ? `Added ${added} new, kept ${items.length - added} existing (${books} books, ${movies} movies)`
    : `Wrote ${items.length} items (${books} books, ${movies} movies)`
  console.log(`${summary} -> ${options.output}`)
}

main().catch((error) => {
  console.error(`Douban shelf sync failed: ${error.message}`)
  process.exit(1)
})
