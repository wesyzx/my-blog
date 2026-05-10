import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const galleryDirectory = path.join(process.cwd(), 'content/gallery')

export interface GalleryMeta {
  slug: string
  title: string
  date: string
  category: string          // 旅游 / 美食 / 日常 / 摄影
  cover: string
  images: string[]
  excerpt: string
  published: boolean
}

export interface GalleryItem extends GalleryMeta {
  content: string
}

export function getAllGalleryItems(): GalleryMeta[] {
  if (!fs.existsSync(galleryDirectory)) return []

  const fileNames = fs.readdirSync(galleryDirectory)
  const items = fileNames
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const slug = f.replace(/\.md$/, '')
      const raw = fs.readFileSync(path.join(galleryDirectory, f), 'utf8')
      const { data } = matter(raw)
      return {
        slug,
        title: data.title || '',
        date: data.date ? new Date(data.date).toISOString() : '',
        category: data.category || '日常',
        cover: data.cover || '',
        images: Array.isArray(data.images) ? data.images : [],
        excerpt: data.excerpt || '',
        published: data.published !== false,
      }
    })
    .filter((item) => item.published)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  return items
}

export function getGalleryBySlug(slug: string): GalleryItem | null {
  try {
    const raw = fs.readFileSync(path.join(galleryDirectory, `${slug}.md`), 'utf8')
    const { data, content } = matter(raw)
    return {
      slug,
      title: data.title || '',
      date: data.date ? new Date(data.date).toISOString() : '',
      category: data.category || '日常',
      cover: data.cover || '',
      images: Array.isArray(data.images) ? data.images : [],
      excerpt: data.excerpt || '',
      published: data.published !== false,
      content,
    }
  } catch {
    return null
  }
}

export const GALLERY_CATEGORIES = ['全部', '旅游', '美食', '日常', '摄影']
