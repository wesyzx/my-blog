import { proxyMemosImage } from '@/lib/memos-file.mjs'
import { getAllSays } from '@/lib/say'

/**
 * Memos 的 /file/** 端点强制鉴权（匿名访问返回 401），浏览器与 next/image 都拿不到图。
 * 只代理当前公开短记实际引用的图片，不将服务端 token 提供给浏览器。
 */
const MEMOS_BASE_URL = process.env.MEMOS_BASE_URL || 'https://memos.guanyan.me'
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyMemosImage(path, {
    baseUrl: MEMOS_BASE_URL,
    token: process.env.MEMOS_TOKEN,
    allowedImages: async () => (await getAllSays()).flatMap((say) => say.images || (say.image ? [say.image] : [])),
  })
}
