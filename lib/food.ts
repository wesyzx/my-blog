import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const foodDirectory = path.join(process.cwd(), 'content/food')

export interface FoodMeta {
  slug: string
  title: string
  date: string
  location: string       // 餐厅/地点名称
  address: string         // 详细地址
  lng: number             // 经度
  lat: number             // 纬度
  cover: string           // 封面图
  images: string[]        // 图集
  tags: string[]
  excerpt: string
  published: boolean
}

export interface FoodPost extends FoodMeta {
  content: string
}

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
