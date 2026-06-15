import { Client } from '@notionhq/client'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const POSTS_DS_ID = '6bff5b12-623c-4404-9e80-66c4b77f82eb' // 底层数据源 ID
const CONTENT_DIR = path.join(process.cwd(), 'content')

async function migratePosts() {
  console.log('🚀 Migrating blog posts to visible database...')
  const dir = path.join(CONTENT_DIR, 'posts')
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))

  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8')
    const { data, content } = matter(raw)
    const slug = f.replace(/\.md$/, '')

    try {
      const properties = {
        'Name': { title: [{ text: { content: data.title || slug } }] },
        'Slug': { rich_text: [{ text: { content: slug } }] },
        'Published': { checkbox: data.published !== false }
      }

      if (data.date) properties['Date'] = { date: { start: new Date(data.date).toISOString().split('T')[0] } }
      // 注意：如果您手动建表时选的是 Select 类型，这里可能需要改成 select 传参。
      // 但如果报错说"不是预期类型"，则可能是因为数据源默认把您新建的列当成了 text
      if (data.category) properties['Category'] = { rich_text: [{ text: { content: data.category } }] } 
      if (data.cover) properties['Cover'] = { url: data.cover }

      await notion.pages.create({
        parent: { data_source_id: POSTS_DS_ID },
        properties: properties,
        children: [
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: content.trim().substring(0, 1000) || ' ' } }] } }
        ]
      })
      console.log(`    ✓ Migrated: ${data.title || slug}`)
    } catch (err) {
      console.error(`    × Failed ${slug}: ${err.message}`)
    }
  }
}

migratePosts()
