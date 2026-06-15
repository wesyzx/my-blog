import { Client } from '@notionhq/client'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const PARENT_PAGE_ID = '3806b7725d3c80728e95f53909613a76'
const CONTENT_DIR = path.join(process.cwd(), 'content')

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('🚀 Starting Definitive Food Migration (Standard JS Mode)...')
  try {
    // 1. 创建最简数据库
    console.log('  - Creating base database...')
    const db = await notion.databases.create({
      parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
      icon: { type: 'emoji', emoji: '🥘' },
      title: [{ type: 'text', text: { content: '🥘 美食地图 (标准版)' } }],
      properties: {
        'Name': { title: {} }
      }
    })
    
    const dbId = db.id
    console.log('    ✓ Database created. ID:', dbId)
    await wait(2000)

    // 2. 迁移数据
    const dir = path.join(CONTENT_DIR, 'food')
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))
    console.log(`  - Migrating ${files.length} food items...`)

    for (const f of files) {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8')
      const { data, content } = matter(raw)
      const slug = f.replace(/\.md$/, '')

      await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          'Name': { title: [{ text: { content: data.title || slug } }] }
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { 
              rich_text: [{ type: 'text', text: { content: content.trim().substring(0, 1000) || ' ' } }] 
            }
          }
        ]
      })
      console.log(`    ✓ Migrated: ${data.title || slug}`)
    }

    console.log('\n✅ Success! Refresh Notion and you will see "🥘 美食地图 (标准版)".')
    console.log('   Now simply click the "+" icon in Notion to add: Date, Location, Address, Lng, Lat, Cover.')
  } catch (error) {
    console.error('\n❌ Failed:', error.message)
  }
}

run()
