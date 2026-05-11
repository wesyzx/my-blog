/**
 * 说说（短动态）内容管理模块
 *
 * 读取 content/say/ 目录下的 Markdown 文件，
 * 每条说说只包含日期和正文，按日期倒序排列。
 */
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

/** 说说文件存放目录 */
const sayDirectory = path.join(process.cwd(), 'content/say')

/** 说说元数据 */
export interface SayMeta {
  slug: string
  date: string
  content: string
}

/**
 * 获取所有说说（按日期倒序）
 */
export function getAllSays(): SayMeta[] {
  if (!fs.existsSync(sayDirectory)) return []

  const fileNames = fs.readdirSync(sayDirectory)

  const says = fileNames
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const slug = f.replace(/\.md$/, '')
      const raw = fs.readFileSync(path.join(sayDirectory, f), 'utf8')
      const { data, content } = matter(raw)
      return {
        slug,
        date: data.date ? new Date(data.date).toISOString() : '',
        content: content.trim(),
      }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  return says
}
