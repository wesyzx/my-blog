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

async function createFullDatabase(title, emoji, schema) {
  console.log(`  - Creating ${title}...`)
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    icon: { type: 'emoji', emoji: emoji },
    title: [{ type: 'text', text: { content: title } }],
    properties: {
      'Name': { title: {} }
    }
  })
  
  const dbId = db.id
  await wait(1000)

  // 使用官方推荐的 PATCH 方式更新结构
  await notion.databases.update({
    database_id: dbId,
    properties: schema
  })
  
  return dbId
}

async function migrateData(dbId, type) {
  const dir = path.join(CONTENT_DIR, type)
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))

  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8')
    const { data, content } = matter(raw)
    const slug = f.replace(/\.md$/, '')

    const props = {
      'Name': { title: [{ text: { content: data.title || slug } }] },
      'Slug': { rich_text: [{ text: { content: slug } }] },
      'Published': { checkbox: data.published !== false }
    }

    if (data.date) props['Date'] = { date: { start: new Date(data.date).toISOString().split('T')[0] } }
    if (data.cover) props['Cover'] = { url: data.cover }
    
    if (type === 'food') {
      props['Location'] = { rich_text: [{ text: { content: data.location || '' } }] }
      props['Address'] = { rich_text: [{ text: { content: data.address || '' } }] }
      props['Lng'] = { number: Number(data.lng) || 0 }
      props['Lat'] = { number: Number(data.lat) || 0 }
    } else if (type === 'posts') {
      props['Category'] = { select: { name: data.category || '生活' } }
    }

    try {
      await notion.pages.create({
        parent: { database_id: dbId },
        properties: props,
        children: [
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: content.trim().substring(0, 1000) || ' ' } }] } }
        ]
      })
      console.log(`    ✓ Done: ${data.title || slug}`)
    } catch (e) {
      console.error(`    × Failed ${slug}: ${e.message}`)
    }
  }
}

async function run() {
  console.log('🚀 Starting One-Click Migration...')
  try {
    const foodId = await createFullDatabase('🥘 美食地图 (全能版)', '🥘', {
      'Date': { date: {} },
      'Location': { rich_text: {} },
      'Address': { rich_text: {} },
      'Lng': { number: {} },
      'Lat': { number: {} },
      'Cover': { url: {} },
      'Published': { checkbox: {} },
      'Slug': { rich_text: {} }
    })
    await migrateData(foodId, 'food')

    const postId = await createFullDatabase('📘 博文列表 (全能版)', '📘', {
      'Date': { date: {} },
      'Category': { select: { options: [
        { name: '生活', color: 'blue' }, { name: '技术', color: 'green' },
        { name: '摄影', color: 'purple' }, { name: '学习', color: 'yellow' }
      ] } },
      'Cover': { url: {} },
      'Published': { checkbox: {} },
      'Slug': { rich_text: {} }
    })
    await migrateData(postId, 'posts')

    console.log('\n✨ ALL DONE!')
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  }
}

run()
