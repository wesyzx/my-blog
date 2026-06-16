/**
 * 相册内容管理模块
 * 现已全面接入 Notion 数据源
 */
import { bundleData } from './data-bundle'

export interface GalleryMeta {
  slug: string
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
  const decodedSlug = decodeURIComponent(slug);
  return (bundleData.gallery as GalleryItem[]).find(i => i.slug === decodedSlug) || null;
}
