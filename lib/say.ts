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

/**
 * 获取所有说说（从 Memos API 或 bundleData）
 */
export async function getAllSays(): Promise<SayMeta[]> {
  // 如果是非开发环境且有 bundleData，优先使用（为了静态生成和性能）
  // 但对于 Memos，我们通常希望它是实时的，所以这里根据需求决定
  // 这里我们优先尝试从 API 获取，失败则回退到 bundle

  try {
    const response = await fetch(`${MEMOS_API_URL}?pageSize=20&filter=visibilities%20in%20['PUBLIC']`, {
      headers: {
        'Authorization': `Bearer ${MEMOS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 60 } // 每分钟重新验证一次
    })

    if (!response.ok) {
      throw new Error(`Memos API error: ${response.statusText}`)
    }

    const data = await response.json()
    const memos = data.memos || []

    return memos.map((memo: any) => {
      // 提取图片资源
      const images = memo.resources
        ?.filter((res: any) => res.type.startsWith('image/'))
        .map((res: any) => {
          // 如果 Memos 部署在子路径或需要完整 URL，请调整
          return `https://memos.guanyan.me/o/r/${res.id}/${res.filename}`
        }) || []

      return {
        slug: memo.name.split('/').pop() || memo.uid,
        date: memo.createTime,
        content: memo.content,
        image: images[0], // 兼容旧版单图显示
        images: images,
      }
    })
  } catch (err) {
    console.error('Error fetching memos:', err)
    return isDev ? [] : (bundleData.says as SayMeta[] || [])
  }
}

