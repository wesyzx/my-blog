import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const moreDirectory = path.join(process.cwd(), 'content/more')

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
  try {
    const fullPath = path.join(moreDirectory, `${slug}.md`)
    if (!fs.existsSync(fullPath)) return null
    
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    return {
      slug,
      title: data.title || '',
      desc: data.desc || '',
      icon: data.icon || '',
      content,
    }
  } catch (error) {
    console.error(`Error reading more content for slug ${slug}:`, error)
    return null
  }
}

/**
 * 获取所有抽屉项的 slug 列表
 */
export function getAllMoreSlugs(): string[] {
  try {
    if (!fs.existsSync(moreDirectory)) return []
    const fileNames = fs.readdirSync(moreDirectory)
    return fileNames
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''))
  } catch {
    return []
  }
}
