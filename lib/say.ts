import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const sayDirectory = path.join(process.cwd(), 'content/say')

export interface SayMeta {
  slug: string
  date: string
  content: string
}

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
