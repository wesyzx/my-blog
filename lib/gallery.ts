/**
 * 相册内容管理模块
 *
 * 读取 content/gallery/ 目录下的 Markdown 文件，
 * 每个相册包含标题、分类、封面图和图片数组，
 * 用于相册列表页和单本相册详情页。
 */
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { bundleData } from './data-bundle'

/** 相册文件存放目录 */
const galleryDirectory = path.join(process.cwd(), 'content/gallery')

const isDev = process.env.NODE_ENV === 'development'

/** 相册元数据 */
export interface GalleryMeta {
  slug: string
  title: string
  date: string
  category: string // 旅游 / 美食 / 日常 / 摄影
  cover: string
  images: string[]
  excerpt: string
  published: boolean
}

/** 完整相册（含描述正文） */
export interface GalleryItem extends GalleryMeta {
  content: string
}

/**
 * 获取所有相册（按日期倒序）
 */
export function getAllGalleryItems(): GalleryMeta[] {
  if (!isDev) {
    return bundleData.gallery;
  }

  try {
    if (!fs.existsSync(galleryDirectory)) return []

    const fileNames = fs.readdirSync(galleryDirectory)
    const items = fileNames
      .filter((f) => {
        const fullPath = path.join(galleryDirectory, f);
        return f.endsWith('.md') && fs.statSync(fullPath).isFile();
      })
      .map((f) => {
        try {
          const slug = f.replace(/\.md$/, '')
          const fullPath = path.join(galleryDirectory, f)
          const raw = fs.readFileSync(fullPath, 'utf8')
          const { data } = matter(raw)
          
          // 安全解析日期
          let dateStr = '';
          if (data.date) {
            const d = new Date(data.date);
            if (!isNaN(d.getTime())) {
              dateStr = d.toISOString();
            }
          }

          return {
            slug,
            title: data.title || slug,
            date: dateStr,
            category: data.category || '日常',
            cover: data.cover || '',
            images: Array.isArray(data.images) 
              ? data.images.filter((img: any) => typeof img === 'string' && img.length > 0) 
              : [],
            excerpt: data.excerpt || '',
            published: data.published !== false,
          }
        } catch (e) {
          console.error(`Error parsing gallery item ${f}:`, e);
          return null;
        }
      })
      .filter((item): item is GalleryMeta => item !== null && item.published)
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date < b.date ? 1 : -1;
      })

    return items
  } catch (err) {
    console.error('Error getting all gallery items:', err);
    return [];
  }
}

/**
 * 根据 slug 获取单个相册详情
 */
export function getGalleryBySlug(slug: string): GalleryItem | null {
  if (!isDev) {
    return (bundleData.gallery as GalleryItem[]).find(i => i.slug === slug) || null;
  }

  try {
    const fullPath = path.join(galleryDirectory, `${slug}.md`)
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return null;
    
    const raw = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(raw)
    
    // 安全解析日期
    let dateStr = '';
    if (data.date) {
      const d = new Date(data.date);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString();
      }
    }

    return {
      slug,
      title: data.title || slug,
      date: dateStr,
      category: data.category || '日常',
      cover: data.cover || '',
      images: Array.isArray(data.images) 
        ? data.images.filter((img: any) => typeof img === 'string' && img.length > 0) 
        : [],
      excerpt: data.excerpt || '',
      published: data.published !== false,
      content,
    }
  } catch (err) {
    console.error(`Error getting gallery by slug ${slug}:`, err);
    return null
  }
}
