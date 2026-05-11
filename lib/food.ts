/**
 * 美食探店内容管理模块
 *
 * 读取 content/food/ 目录下的 Markdown 文件，
 * 每条探店记录包含地理位置（经纬度）、地址、图集等字段，
 * 用于美食地图页面和探店详情页。
 */
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

/** 探店记录存放目录 */
const foodDirectory = path.join(process.cwd(), 'content/food')

/** 探店记录元数据 */
export interface FoodMeta {
  slug: string
  title: string
  date: string
  location: string // 餐厅/地点名称
  address: string // 详细地址
  lng: number // 经度（用于地图标注）
  lat: number // 纬度（用于地图标注）
  cover: string
  images: string[] // 店内图集
  tags: string[]
  excerpt: string
  published: boolean
}

/** 完整探店记录（含正文） */
export interface FoodPost extends FoodMeta {
  content: string
}

/**
 * 获取所有探店记录（按日期倒序）
 */
export function getAllFoodPosts(): FoodMeta[] {
  if (!fs.existsSync(foodDirectory)) return []

  const fileNames = fs.readdirSync(foodDirectory)

  const posts = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '')
      const fullPath = path.join(foodDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data } = matter(fileContents)

      return {
        slug,
        title: data.title || '',
        date: data.date ? new Date(data.date).toISOString() : '',
        location: data.location || '',
        address: data.address || '',
        lng: Number(data.lng) || 0,
        lat: Number(data.lat) || 0,
        cover: data.cover || '',
        images: Array.isArray(data.images) ? data.images : [],
        tags: Array.isArray(data.tags)
          ? data.tags.map((t: unknown) => String(t))
          : [],
        excerpt: data.excerpt || '',
        published: data.published !== false,
      }
    })
    .filter((post) => post.published)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  return posts
}

/**
 * 根据 slug 获取单篇探店详情
 */
export function getFoodPostBySlug(slug: string): FoodPost | null {
  try {
    const fullPath = path.join(foodDirectory, `${slug}.md`)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    return {
      slug,
      title: data.title || '',
      date: data.date ? new Date(data.date).toISOString() : '',
      location: data.location || '',
      address: data.address || '',
      lng: Number(data.lng) || 0,
      lat: Number(data.lat) || 0,
      cover: data.cover || '',
      images: Array.isArray(data.images) ? data.images : [],
      tags: Array.isArray(data.tags)
        ? data.tags.map((t: unknown) => String(t))
        : [],
      excerpt: data.excerpt || '',
      published: data.published !== false,
      content,
    }
  } catch {
    return null
  }
}
