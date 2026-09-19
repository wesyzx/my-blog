import 'server-only'
import { bundleData } from './data-bundle'

const MEMOS_BASE_URL = process.env.MEMOS_BASE_URL || 'https://memos.guanyan.me'
const MEMOS_API_URL = process.env.MEMOS_API_URL || `${MEMOS_BASE_URL}/api/v1/memos`
const MEMOS_PROXY_PREFIX = '/api/memos/file'

export interface SayMeta {
  slug: string
  date: string
  content: string
  image?: string
  images?: string[]
}

interface MemosAttachment { id?: string; name?: string; filename?: string; type?: string; externalLink?: string }
interface Memo {
  id?: string
  uid?: string
  name?: string
  state?: string
  createTime?: string
  displayTime?: string
  content?: string
  /** Memos v0.25 起更名为 attachments，旧版本为 resources */
  attachments?: MemosAttachment[]
  resources?: MemosAttachment[]
}
interface MemosResponse { memos?: Memo[] }

/** Memos 的 /file/** 端点需要鉴权，浏览器无法直连，统一改走本站代理 */
export function toProxyUrl(url: string) {
  const match = String(url || '').match(/^https?:\/\/memos\.guanyan\.me\/file\/(.+)$/)
  return match ? `${MEMOS_PROXY_PREFIX}/${match[1]}` : url
}

function attachmentUrl(attachment: MemosAttachment) {
  if (attachment.externalLink) return attachment.externalLink
  const id = attachment.name ? attachment.name.split('/').pop() : attachment.id
  return id && attachment.filename ? `${MEMOS_PROXY_PREFIX}/attachments/${id}/${attachment.filename}` : ''
}

export function parseMemos(data: MemosResponse): SayMeta[] {
  return (data.memos || []).filter((memo) => memo.state === 'NORMAL').map((memo) => {
    const attachments = memo.attachments || memo.resources || []
    const resourceImages = attachments.filter((item) => !item.type || item.type.startsWith('image/')).map(attachmentUrl).filter(Boolean)
    const contentImages = Array.from((memo.content || '').matchAll(/!\[.*?\]\((https?:\/\/.*?)\)/g), (match) => toProxyUrl(match[1]))
    const images = Array.from(new Set([...resourceImages, ...contentImages]))
    const slug = memo.name?.split('/').pop() || memo.uid || memo.id || ''
    return {
      slug,
      date: memo.createTime || memo.displayTime || '',
      content: (memo.content || '').replace(/!\[.*?\]\((.*?)\)/g, '').trim(),
      image: images[0],
      images,
    }
  }).filter((memo) => memo.slug)
}

export async function getAllSays(): Promise<SayMeta[]> {
  try {
    if (!process.env.MEMOS_TOKEN) throw new Error('MEMOS_TOKEN 未设置')
    const response = await fetch(`${MEMOS_API_URL}?pageSize=20`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${process.env.MEMOS_TOKEN}` },
      // 不缓存：短记的增删都要求立刻反映到页面上。
      // 之前用 next: { revalidate: 60 }，加上页面本身的 ISR，最坏要等两分钟还得刷两次。
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`Memos API returned HTTP ${response.status}`)
    const says = parseMemos(await response.json() as MemosResponse)
    return says.length > 0 ? says : bundleData.says as SayMeta[]
  } catch (error) {
    const reason = process.env.MEMOS_TOKEN
      ? `请求失败：${(error as Error).message}`
      : '未配置 MEMOS_TOKEN —— 请求以匿名身份发出，Memos 会直接返回 401'
    console.error([
      '',
      '  ! Memos 同步失败 —— 短记页面将继续沿用旧快照，内容不会更新',
      `  ! 原因: ${reason}`,
      '  ! 修复: 在 .env.local 与部署环境配置有效的 MEMOS_TOKEN',
      `  ! 自检: curl -H "Authorization: Bearer $MEMOS_TOKEN" "${MEMOS_BASE_URL}/api/v1/memos?pageSize=2"`,
      '',
    ].join('\n'))
    return bundleData.says as SayMeta[]
  }
}
