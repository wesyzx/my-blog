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
    // 简化请求，去掉可能导致编码问题的 filter
    const response = await fetch(`${MEMOS_API_URL}?pageSize=20`, {
      headers: {
        'Authorization': `Bearer ${MEMOS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store' // 测试阶段禁用缓存，确保看到最新数据
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
        // 提取图片资源
        const images = memo.resources
          ?.filter((res: any) => res.type.startsWith('image/'))
          .map((res: any) => {
            return `https://memos.guanyan.me/o/r/${res.id}/${res.filename}`
          }) || []

        return {
          slug: memo.name.split('/').pop() || memo.uid,
          date: memo.createTime,
          content: memo.content,
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
