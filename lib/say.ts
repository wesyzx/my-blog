import 'server-only'
import { bundleData } from './data-bundle'

const MEMOS_API_URL = process.env.MEMOS_API_URL || 'https://memos.guanyan.me/api/v1/memos'

export interface SayMeta {
  slug: string
  date: string
  content: string
  image?: string
  images?: string[]
}

interface MemosResource { id?: string; name?: string; filename?: string; type?: string; externalLink?: string }
interface Memo { id?: string; uid?: string; name?: string; state?: string; createTime?: string; displayTime?: string; content?: string; resources?: MemosResource[] }
interface MemosResponse { memos?: Memo[] }

function resourceUrl(resource: MemosResource) {
  if (resource.externalLink) return resource.externalLink
  if (resource.name) return `https://memos.guanyan.me/file/${resource.name}/${resource.filename || ''}`
  return resource.id ? `https://memos.guanyan.me/o/r/${resource.id}/${resource.filename || ''}` : ''
}

export function parseMemos(data: MemosResponse): SayMeta[] {
  return (data.memos || []).filter((memo) => memo.state === 'NORMAL').map((memo) => {
    const resourceImages = (memo.resources || []).filter((resource) => !resource.type || resource.type.startsWith('image/')).map(resourceUrl).filter(Boolean)
    const contentImages = Array.from((memo.content || '').matchAll(/!\[.*?\]\((https?:\/\/.*?)\)/g), (match) => match[1])
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
    const headers: HeadersInit = { Accept: 'application/json' }
    if (process.env.MEMOS_TOKEN) headers.Authorization = `Bearer ${process.env.MEMOS_TOKEN}`
    const response = await fetch(`${MEMOS_API_URL}?pageSize=20`, { headers, next: { revalidate: 60 } })
    if (!response.ok) throw new Error(`Memos API returned HTTP ${response.status}`)
    const says = parseMemos(await response.json() as MemosResponse)
    return says.length > 0 ? says : bundleData.says as SayMeta[]
  } catch (error) {
    console.error('Failed to fetch Memos, using bundled snapshot:', error)
    return bundleData.says as SayMeta[]
  }
}
