/**
 * Shared by the build snapshot and live pages.
 * @typedef {{ placeholder?: string, latitude?: number, longitude?: number }} MemoLocation
 * @typedef {{ slug: string, date: string, content: string, image?: string, images?: string[], location?: string, latitude?: number, longitude?: number }} SayMeta
 * @typedef {{ id?: string, name?: string, filename?: string, type?: string, externalLink?: string }} Attachment
 * @typedef {{ id?: string, uid?: string, name?: string, state?: string, visibility?: string | number, createTime?: string, displayTime?: string, content?: string, location?: MemoLocation, attachments?: Attachment[], resources?: Attachment[] }} Memo
 */

import { enrichSayLocations } from './tmap-geocode.mjs'

const PROXY_PREFIX = '/api/memos/file'

/** @param {string} url */
function toProxyUrl(url, baseUrl = 'https://memos.guanyan.me') {
  const parsed = new URL(baseUrl)
  const match = url.match(new RegExp(`^https?:\\/\\/${parsed.host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/file\\/(.+)$`))
  return match ? `${PROXY_PREFIX}/${match[1]}` : url
}

/** @param {Attachment} attachment */
function attachmentUrl(attachment) {
  if (attachment.externalLink) return attachment.externalLink
  const id = attachment.name ? attachment.name.split('/').pop() : attachment.id
  return id && attachment.filename ? `${PROXY_PREFIX}/attachments/${encodeURIComponent(id)}/${encodeURIComponent(attachment.filename)}` : ''
}

/** Memos 的 location 是可选项，只有合法经纬度才参与地图渲染。 */
function memoLocation(location) {
  if (!location || typeof location !== 'object') return undefined
  const { latitude, longitude } = location
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) return undefined
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return undefined
  return {
    latitude,
    longitude,
    placeholder: typeof location.placeholder === 'string' ? location.placeholder.trim() : '',
  }
}

/**
 * @param {{ memos?: Memo[] }} data
 * @returns {SayMeta[]}
 */
export function parseMemos(data, baseUrl) {
  return (data.memos || []).filter((memo) => memo.state === 'NORMAL'
    && (memo.visibility === 'PUBLIC' || memo.visibility === 3)).map((memo) => {
    // Memos v0.25 renamed resources to attachments.
    const attachments = memo.attachments || memo.resources || []
    const resourceImages = attachments.filter((item) => !item.type || item.type.startsWith('image/')).map(attachmentUrl).filter(Boolean)
    const contentImages = Array.from((memo.content || '').matchAll(/!\[.*?\]\((https?:\/\/.*?)\)/g), (match) => toProxyUrl(match[1], baseUrl))
    const images = Array.from(new Set([...resourceImages, ...contentImages]))
    const location = memoLocation(memo.location)
    return {
      slug: memo.name?.split('/').pop() || memo.uid || memo.id || '',
      date: memo.createTime || memo.displayTime || '',
      content: (memo.content || '').replace(/!\[.*?\]\((.*?)\)/g, '').trim(),
      image: images[0],
      images,
      ...(location ? { location: location.placeholder || undefined, latitude: location.latitude, longitude: location.longitude } : {}),
    }
  }).filter((memo) => memo.slug)
}

/**
 * An empty successful response stays empty; callers fall back only on errors.
 * @param {string} apiUrl
 * @param {string | undefined} token
 * @param {RequestInit} options
 */
export async function fetchMemos(apiUrl, token, options = {}) {
  if (!token) throw new Error('MEMOS_TOKEN 未设置')
  const response = await fetch(`${apiUrl}?pageSize=20`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(10_000),
    redirect: 'error',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`Memos API returned HTTP ${response.status}`)
  const says = parseMemos(await response.json(), new URL(apiUrl).origin)
  return enrichSayLocations(says, { key: process.env.TMAP_SERVER_KEY })
}

/**
 * Snapshot notes need the same address enrichment as live notes.
 * @param {string} apiUrl
 * @param {string | undefined} token
 * @param {RequestInit} options
 * @param {(error: unknown) => SayMeta[] | Promise<SayMeta[]>} onFailure
 */
export async function fetchMemosWithFallback(apiUrl, token, options, onFailure) {
  try {
    return await fetchMemos(apiUrl, token, options)
  } catch (error) {
    const says = await onFailure(error)
    return enrichSayLocations(says, { key: process.env.TMAP_SERVER_KEY })
  }
}
