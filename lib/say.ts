import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const sayDirectory = path.join(process.cwd(), 'content/say')

export interface SayMeta {
  slug: string
  date: string
  pinned: boolean
  content: string
}

export function getAllSays(): SayMeta[] {
  if (!fs.existsSync(sayDirectory)) return []

  const fileNames = fs.readdirSync(sayDirectory)

  const says = fileNames
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const slug = f.replace(/\.mdx$/, '')
      const raw = fs.readFileSync(path.join(sayDirectory, f), 'utf8')
      const { data, content } = matter(raw)
      return {
        slug,
        date: data.date ? new Date(data.date).toISOString() : '',
        pinned: data.pinned === true,
        content: content.trim(),
      }
    })
    .sort((a, b) => {
      // 置顶优先，然后按日期倒序
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return a.date < b.date ? 1 : -1
    })

  return says
}
