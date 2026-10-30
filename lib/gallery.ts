/**
 * 相册内容管理模块
 * 从构建时生成的内容快照读取
 */
import { bundleData } from './data-bundle'
import { decodeRouteSlug } from './slug'

export interface GalleryMeta {
  slug: string
  aliases?: string[]
  title: string
  date: string
  category: string // 旅游 / 美食 / 日常 / 摄影
  cover: string
  images: { src: string; width: number; height: number }[]
  excerpt: string
  published: boolean
}

export interface GalleryItem extends GalleryMeta {
  content: string
}

/**
 * 获取所有相册（按日期倒序）
 */
export function getAllGalleryItems(): GalleryMeta[] {
  return bundleData.gallery as GalleryMeta[];
}

/**
 * 根据 slug 获取单个相册详情
 */
export function getGalleryBySlug(slug: string): GalleryItem | null {
  const decodedSlug = decodeRouteSlug(slug)
  return (bundleData.gallery as GalleryItem[]).find(i => i.slug === decodedSlug || i.aliases?.includes(decodedSlug)) || null;
}
