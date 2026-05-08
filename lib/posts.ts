import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

// 定义文章目录的绝对路径：当前工作目录 + content/posts
const postsDirectory = path.join(process.cwd(), 'content/posts')

/**
 * 文章元数据接口定义
 * 用于规范一篇文章包含的基础信息字段
 */
export interface PostMeta {
  slug: string      // 文章的唯一标识（通常是文件名）
  title: string     // 标题
  date: string      // 发布日期
  category: string  // 分类
  tags: string[]    // 标签数组
  excerpt: string   // 摘要
  cover: string     // 封面图链接
  published: boolean // 是否已发布（控制可见性）
}

/**
 * 完整文章接口定义
 * 继承自 PostMeta，并额外包含 content（文章正文内容）
 */
export interface Post extends PostMeta {
  content: string
}

/**
 * 获取所有已发布的文章列表（不包含正文内容，常用于列表页）
 * @returns 排序后的文章元数据数组
 */
export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) return []

  // 读取文章目录下的所有文件名
  const fileNames = fs.readdirSync(postsDirectory)

  const posts = fileNames
    .filter((fileName) => fileName.endsWith('.mdx')) // 只处理 .mdx 后缀的文件
    .map((fileName) => {
      // 去掉文件后缀作为 slug
      const slug = fileName.replace(/\.mdx$/, '')
      const fullPath = path.join(postsDirectory, fileName)
      
      // 读取文件字符串内容
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      
      // 使用 gray-matter 解析 Frontmatter (文件顶部的 YAML 内容)
      const { data } = matter(fileContents)

      // 组装并返回标准化的文章对象
      return {
        slug,
        title: data.title || '',
        // 将日期统一转换为 ISO 字符串格式，方便前端排序和显示
        date: data.date ? new Date(data.date).toISOString() : '',
        category: data.category || '未分类',
        // 处理标签：支持数组格式或逗号分隔的字符串格式
        tags: Array.isArray(data.tags)
          ? data.tags.map((tag: unknown) => String(tag))
          : typeof data.tags === 'string'
            ? data.tags
                .split(',')
                .map((tag: string) => tag.trim())
                .filter(Boolean)
            : [],
        excerpt: data.excerpt || '',
        cover: data.cover || '',
        published: data.published !== false, // 默认为 true
      }
    })
    // 过滤掉标记为“未发布”的文章
    .filter((post) => post.published)
    // 按日期从新到旧排序
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  return posts
}

/**
 * 根据 slug 获取单篇文章的详细信息（包含正文）
 * @param slug 文章唯一标识
 * @returns 文章对象或 null
 */
export function getPostBySlug(slug: string): Post | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    
    // 解析元数据 (data) 和 正文内容 (content)
    const { data, content } = matter(fileContents)

    return {
      slug,
      title: data.title || '',
      date: data.date ? new Date(data.date).toISOString() : '',
      category: data.category || '未分类',
      tags: Array.isArray(data.tags)
        ? data.tags.map((tag: unknown) => String(tag))
        : typeof data.tags === 'string'
          ? data.tags
              .split(',')
              .map((tag: string) => tag.trim())
              .filter(Boolean)
          : [],
      excerpt: data.excerpt || '',
      cover: data.cover || '',
      published: data.published !== false,
      content, // 返回 Markdown 源码，后续由前端渲染
    }
  } catch {
    // 如果找不到文件或解析失败，返回 null
    return null
  }
}

/**
 * 获取所有文章中出现的分类列表
 * @returns 分类数组，首位是“全部”
 */
export function getAllCategories(): string[] {
  const posts = getAllPosts()
  const categories = posts.map((post) => post.category)
  // 使用 Set 进行去重，并在开头添加“全部”选项
  return ['全部', ...Array.from(new Set(categories))]
}
