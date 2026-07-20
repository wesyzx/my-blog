/**
 * 说说（短动态）内容管理模块
 *
 * 现已迁移至 Memos API。
 * 从远程 Memos 实例获取数据，支持图片和 Markdown。
 */
import { bundleData } from './data-bundle'

const MEMOS_API_URL = 'https://memos.guanyan.me/api/v1/memos'
const MEMOS_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6InYxIiwidHlwIjoiSldUIn0.eyJuYW1lIjoiIiwiaXNzIjoibWVtb3MiLCJzdWIiOiIxIiwiYXVkIjpbInVzZXIuYWNjZXNzLXRva2VuIl0sImV4cCI6MTc4MjA5MjU3MCwiaWF0IjoxNzgxNDg3NzcwfQ.GZ3Ud0caJ3akDASTDdqP0b-L3W-jRI4BTAYu3yRevAc'

const isDev = process.env.NODE_ENV === 'development'

/** 说说元数据 */
export interface SayMeta {
  slug: string
  date: string
  content: string
  image?: string
  images?: string[] // 支持多图
}

export async function getAllSays(): Promise<SayMeta[]> {
  try {
    // 简化请求，配置 ISR 缓存（每 60 秒后台刷新一次），大幅加快博客的说说页面加载速度
    const response = await fetch(`${MEMOS_API_URL}?pageSize=20`, {
      headers: {
        'Authorization': `Bearer ${MEMOS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 60 }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Memos API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    // 检查数据结构是否符合预期
    const memos = data.memos || []

    return memos
      .filter((memo: any) => memo.state === 'NORMAL') // 只显示正常状态的说说
      .map((memo: any) => {
        // 提取图片资源 (兼容 Memos v0.22+ / v1 及旧版 API)
        const resourceImages = memo.resources
          ?.filter((res: any) => (res.type ? res.type.startsWith('image/') : true))
          .map((res: any) => {
            if (res.externalLink) return res.externalLink
            if (res.name) {
              return `https://memos.guanyan.me/file/${res.name}/${res.filename || ''}`
            }
            const resId = res.id || (res.name ? res.name.replace(/^resources\//, '') : '')
            return `https://memos.guanyan.me/o/r/${resId}/${res.filename || ''}`
          }) || []

        // 提取正文中的 Markdown 图片
        const mdImageRegex = /!\[.*?\]\((.*?)\)/g
        const contentImages: string[] = []
        let match: RegExpExecArray | null
        while ((match = mdImageRegex.exec(memo.content || '')) !== null) {
          contentImages.push(match[1])
        }

        // 清理正文中的 Markdown 图片语法，避免以纯文本形式留在页面中
        const cleanContent = (memo.content || '').replace(/!\[.*?\]\((.*?)\)/g, '').trim()

        const images = Array.from(new Set([...resourceImages, ...contentImages]))

        return {
          slug: memo.name ? memo.name.split('/').pop() : (memo.uid || memo.id),
          date: memo.createTime || memo.displayTime,
          content: cleanContent,
          image: images[0],
          images: images,
        }
      })
  } catch (err) {
    console.error('Failed to fetch memos from API:', err)
    // 如果 API 失败，尝试回退到本地打包数据（如果有的话）
    return ((bundleData as any).says as SayMeta[] || [])
  }
}
