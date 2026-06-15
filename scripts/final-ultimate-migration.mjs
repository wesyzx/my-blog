import { Client } from '@notionhq/client'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const FOOD_DS_ID = '3806b772-5d3c-8046-88b8-000b3b624968' // 对应"测试美食"的底层数据源
const POSTS_DS_ID = '6bff5b12-623c-4404-9e80-66c4b77f82eb' // 对应"📘 博文列表"的底层数据源
const CONTENT_DIR = path.join(process.cwd(), 'content')

async function migrateFood() {
  console.log('🚀 Migrating food items to visible database...')
  const dir = path.join(CONTENT_DIR, 'food')
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))

  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8')
    const { data, content } = matter(raw)
    const slug = f.replace(/\.md$/, '')

    try {
      const properties = {
        '名称': { title: [{ text: { content: data.title || slug } }] },
        'slug': { rich_text: [{ text: { content: slug } }] }
      }

      if (data.date) {
        properties['Date'] = { date: { start: new Date(data.date).toISOString().split('T')[0] } }
      }

      await notion.pages.create({
        parent: { data_source_id: FOOD_DS_ID },
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

async function migratePosts() {
  console.log('🚀 Migrating blog posts to visible database...')
  const dir = path.join(CONTENT_DIR, 'posts')
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))

  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8')
    const { data, content } = matter(raw)
    const slug = f.replace(/\.md$/, '')

    if (slug === 'Heelo-World') continue

    try {
      const properties = {
        'Name': { title: [{ text: { content: data.title || slug } }] },
        'Slug': { rich_text: [{ text: { content: slug } }] },
        'Published': { checkbox: data.published !== false }
      }

      if (data.date) properties['Date'] = { date: { start: new Date(data.date).toISOString().split('T')[0] } }
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

async function run() {
  await migrateFood()
  await migratePosts()
  console.log('✨ Migration to VISIBLE databases completed successfully!')
}

run()
