import { Client } from '@notionhq/client'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const PARENT_PAGE_ID = '3806b7725d3c80728e95f53909613a76'
const CONTENT_DIR = path.join(process.cwd(), 'content')

async function createAndMigrate(title, emoji, type, processProps) {
  console.log(`🚀 Processing ${title}...`)
  
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    icon: { type: 'emoji', emoji: emoji },
    title: [{ type: 'text', text: { content: title } }],
    properties: {
      'Name': { title: {} }
    }
  })
  
  const dsId = db.id
  console.log(`  - Database created.`)
  
  await new Promise(r => setTimeout(r, 2000))

  const dir = path.join(CONTENT_DIR, type)
  if (!fs.existsSync(dir)) return
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))
  console.log(`  - Found ${files.length} items.`)

  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8')
    const { data, content } = matter(raw)
    const slug = f.replace(/\.md$/, '')

    try {
      const properties = {
        'Name': { title: [{ text: { content: data.title || slug } }] }
      }
      
      processProps(properties, data, slug)

      await notion.pages.create({
        parent: { database_id: dsId },
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
  return dsId
}

async function run() {
  try {
    await createAndMigrate('📷 我的相册', '📷', 'gallery', (props, data, slug) => {
    })

    await createAndMigrate('📥 抽屉与更多', '📥', 'more', (props, data, slug) => {
    })
    
    console.log('\n✨ Base migration for Gallery and More completed!')
    console.log('Please open Notion and manually add the necessary columns (Date, Category, Slug, etc.) to these new databases.')
  } catch (error) {
    console.error(error)
  }
}

run()
