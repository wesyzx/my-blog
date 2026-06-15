import { Client } from '@notionhq/client'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const PARENT_PAGE_ID = '3806b7725d3c80728e95f53909613a76'
const CONTENT_DIR = path.join(process.cwd(), 'content')

/**
 * 迁移博文数据
 */
async function migratePosts() {
  console.log('  - Creating Post items as pages under main page...')
  
  const dir = path.join(CONTENT_DIR, 'posts')
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))

  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8')
    const { data, content } = matter(raw)
    const slug = f.replace(/\.md$/, '')

    try {
      await notion.pages.create({
        parent: { page_id: PARENT_PAGE_ID },
        properties: {
          title: { title: [{ text: { content: data.title || slug } }] }
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: `Date: ${data.date || ''}\nCategory: ${data.category || ''}\nSlug: ${slug}\n\n${content.substring(0, 1500)}` } }] }
          }
        ]
      })
      console.log(`    ✓ Migrated: ${data.title || slug}`)
    } catch (err) {
      console.error(`    × Failed: ${slug}`, err.message)
    }
  }
}

migratePosts()
