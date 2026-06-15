/**
 * 抽屉/更多页面内容管理模块
 * 现已全面接入 Notion 数据源
 */
import { bundleData } from './data-bundle'

export interface MoreContent {
  slug: string
  title: string
  desc: string
  icon: string
  content: string
}

/**
 * 根据 slug 获取抽屉项内容
 * @param slug 抽屉项标识，如 'goods', 'apps'
 */
export function getMoreContentBySlug(slug: string): MoreContent | null {
  const decodedSlug = decodeURIComponent(slug);
  return (bundleData.more as MoreContent[]).find(m => m.slug === decodedSlug) || null;
}

/**
 * 获取所有抽屉项的 slug 列表
 */
export function getAllMoreSlugs(): string[] {
  return (bundleData.more as MoreContent[]).map(m => m.slug);
}
