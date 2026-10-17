/**
 * Shared by the build snapshot and live pages.
 * @typedef {{ placeholder?: string, latitude?: number, longitude?: number }} MemoLocation
 * @typedef {{ slug: string, date: string, content: string, image?: string, images?: string[], location?: string, latitude?: number, longitude?: number }} SayMeta
 * @typedef {{ id?: string, name?: string, filename?: string, type?: string, externalLink?: string }} Attachment
 * @typedef {{ id?: string, uid?: string, name?: string, state?: string, createTime?: string, displayTime?: string, content?: string, location?: MemoLocation, attachments?: Attachment[], resources?: Attachment[] }} Memo
 */

const PROXY_PREFIX = '/api/memos/file'

/** @param {string} url */
function toProxyUrl(url) {
  const match = url.match(/^https?:\/\/memos\.guanyan\.me\/file\/(.+)$/)
  return match ? `${PROXY_PREFIX}/${match[1]}` : url
}

/** @param {Attachment} attachment */
function attachmentUrl(attachment) {
  if (attachment.externalLink) return attachment.externalLink
  const id = attachment.name ? attachment.name.split('/').pop() : attachment.id
  return id && attachment.filename ? `${PROXY_PREFIX}/attachments/${id}/${attachment.filename}` : ''
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
export function parseMemos(data) {
  return (data.memos || []).filter((memo) => memo.state === 'NORMAL').map((memo) => {
    // Memos v0.25 renamed resources to attachments.
    const attachments = memo.attachments || memo.resources || []
    const resourceImages = attachments.filter((item) => !item.type || item.type.startsWith('image/')).map(attachmentUrl).filter(Boolean)
    const contentImages = Array.from((memo.content || '').matchAll(/!\[.*?\]\((https?:\/\/.*?)\)/g), (match) => toProxyUrl(match[1]))
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
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`Memos API returned HTTP ${response.status}`)
  return parseMemos(await response.json())
}
