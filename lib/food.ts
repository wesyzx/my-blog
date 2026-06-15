/**
 * 美食探店内容管理模块
 * 现已全面接入 Notion 数据源
 */
import { bundleData } from './data-bundle'

export interface FoodMeta {
  slug: string
  title: string
  date: string
  location: string
  address: string
  lng: number
  lat: number
  cover: string
  images: string[]
  tags: string[]
  excerpt: string
  published: boolean
}

export interface FoodPost extends FoodMeta {
  content: string
}

/**
 * 获取所有探店记录（按日期倒序）
 */
export async function getAllFoodPosts(): Promise<FoodMeta[]> {
  return bundleData.food as FoodMeta[];
}

/**
 * 根据 slug 获取单篇探店详情
 */
export async function getFoodPostBySlug(slug: string): Promise<FoodPost | null> {
  return (bundleData.food as FoodPost[]).find(p => p.slug === slug) || null;
}
