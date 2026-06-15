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

/**
 * 助手函数：创建数据库并重试属性更新
 */
async function createStructuredDatabase(title, icon, properties) {
  console.log(`  - Creating ${title} database...`)
  // 1. 创建带标题的数据库
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    icon: { type: 'emoji', emoji: icon },
    title: [{ type: 'text', text: { content: title } }],
    properties: {
      Name: { title: {} } // 初始只带标题列
    }
  })
  
  const dbId = db.id
  console.log(`    ✓ Database created. Adding properties...`)
  await wait(2000)

  // 2. 更新数据库以添加所有自定义属性
  await notion.databases.update({
    database_id: dbId,
    properties: properties
  })
  
  console.log(`    ✓ Properties added successfully.`)
  return dbId
}

async function migrateFood(dbId) {
  const dir = path.join(CONTENT_DIR, 'food')
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))
  console.log(`  - Migrating ${files.length} food items...`)

  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8')
    const { data, content } = matter(raw)
    const slug = f.replace(/\.md$/, '')

    try {
      await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          Name: { title: [{ text: { content: data.title || slug } }] },
          Date: { date: { start: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0] } },
          Location: { rich_text: [{ text: { content: data.location || '' } }] },
          Address: { rich_text: [{ text: { content: data.address || '' } }] },
          Lng: { number: Number(data.lng) || 0 },
          Lat: { number: Number(data.lat) || 0 },
          Cover: { url: data.cover || '' },
          Published: { checkbox: data.published !== false },
          Slug: { rich_text: [{ text: { content: slug } }] }
        },
        children: [
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: content.trim().substring(0, 2000) || ' ' } }] } }
        ]
      })
      console.log(`    ✓ Migrated: ${data.title || slug}`)
    } catch (err) {
      console.error(`    × Failed: ${slug}`, err.message)
    }
  }
}

async function migratePosts(dbId) {
  const dir = path.join(CONTENT_DIR, 'posts')
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))
  console.log(`  - Migrating ${files.length} posts...`)

  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8')
    const { data, content } = matter(raw)
    const slug = f.replace(/\.md$/, '')

    try {
      await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          Name: { title: [{ text: { content: data.title || slug } }] },
          Date: { date: { start: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0] } },
          Category: { select: { name: data.category || '生活' } },
          Cover: { url: data.cover || '' },
          Published: { checkbox: data.published !== false },
          Slug: { rich_text: [{ text: { content: slug } }] }
        },
        children: [
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: content.trim().substring(0, 2000) || ' ' } }] } }
        ]
      })
      console.log(`    ✓ Migrated: ${data.title || slug}`)
    } catch (err) {
      console.error(`    × Failed: ${slug}`, err.message)
    }
  }
}

async function run() {
  console.log('🚀 Starting Robust Migration...')
  try {
    // 1. Food
    const foodDbId = await createStructuredDatabase('🥘 美食地图', '🥘', {
      Date: { date: {} },
      Location: { rich_text: {} },
      Address: { rich_text: {} },
      Lng: { number: {} },
      Lat: { number: {} },
      Cover: { url: {} },
      Published: { checkbox: {} },
      Slug: { rich_text: {} }
    })
    await migrateFood(foodDbId)

    // 2. Posts
    const postDbId = await createStructuredDatabase('📘 博文列表', '📘', {
      Date: { date: {} },
      Category: { select: { options: [
        { name: '生活', color: 'blue' },
        { name: '技术', color: 'green' },
        { name: '摄影', color: 'purple' },
        { name: '学习', color: 'yellow' }
      ] } },
      Cover: { url: {} },
      Published: { checkbox: {} },
      Slug: { rich_text: {} }
    })
    await migratePosts(postDbId)

    console.log('\n✅ Full migration finished! Refresh your Notion page.')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
  }
}

run()
