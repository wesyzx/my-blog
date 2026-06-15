/**
 * 文章内容管理模块
 *
 * 负责读取 content/posts/ 目录下的 Markdown 文件，
 * 使用 gray-matter 解析 Frontmatter（标题、日期、分类、标签等），
 * 为博客的文章列表和详情页提供数据。
 */
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { bundleData } from './data-bundle'

/** 文章 Markdown 文件的存放目录 */
const postsDirectory = path.join(process.cwd(), 'content/posts')

const isDev = process.env.NODE_ENV === 'development'

/** 文章元数据（不含正文，用于列表页） */
export interface PostMeta {
  slug: string // 文章唯一标识，取自文件名
  title: string
  date: string
  category: string // 博文分类：生活 / 技术 / 摄影 / 学习
  tags: string[]
  excerpt: string // 摘要
  cover: string // 封面图 URL
  published: boolean
}

/** 完整文章（含 Markdown 正文，用于详情页） */
export interface Post extends PostMeta {
  content: string
}

/**
 * 获取所有已发布文章（仅元数据，按日期倒序）
 * 用于首页、分类筛选等列表场景
 */
export function getAllPosts(): PostMeta[] {
  return bundleData.posts as PostMeta[];
}

/**
 * 根据 slug 获取单篇文章详情（含正文内容）
 * @returns 文章对象，找不到则返回 null
 */
export function getPostBySlug(slug: string): Post | null {
  const decodedSlug = decodeURIComponent(slug);
  return (bundleData.posts as Post[]).find(p => p.slug === decodedSlug) || null;
}

/**
 * 获取所有文章中出现的分类列表
 * @returns 分类数组，首位固定为「全部」
 */
export function getAllCategories(): string[] {
  const posts = getAllPosts()
  const categories = posts.map((post) => post.category)
  return ['全部', ...Array.from(new Set(categories))]
}

