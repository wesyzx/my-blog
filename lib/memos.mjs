/**
 * Shared by the build snapshot and live pages.
 * @typedef {{ slug: string, date: string, content: string, image?: string, images?: string[] }} SayMeta
 * @typedef {{ id?: string, name?: string, filename?: string, type?: string, externalLink?: string }} Attachment
 * @typedef {{ id?: string, uid?: string, name?: string, state?: string, createTime?: string, displayTime?: string, content?: string, attachments?: Attachment[], resources?: Attachment[] }} Memo
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
    return {
      slug: memo.name?.split('/').pop() || memo.uid || memo.id || '',
      date: memo.createTime || memo.displayTime || '',
      content: (memo.content || '').replace(/!\[.*?\]\((.*?)\)/g, '').trim(),
      image: images[0],
      images,
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
