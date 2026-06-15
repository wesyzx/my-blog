import { Client } from '@notionhq/client'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const GALLERY_DS_ID = '64bd6b1e-26f0-4994-9c11-1232e3590807'
const MORE_DS_ID = '70208dcf-6091-4e54-af59-cf0b21ada509'
const CONTENT_DIR = path.join(process.cwd(), 'content')

async function migrateGallery() {
  console.log('🚀 Migrating Gallery items...')
  const dir = path.join(CONTENT_DIR, 'gallery')
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))

  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8')
    const { data, content } = matter(raw)
    const slug = f.replace(/\.md$/, '')

    try {
      const properties = {
        // Notion defaults title column to something, but we try 'Name' or 'Name/名称/title' depending on user input
        // Using "title" property type ensures it matches the title column regardless of its name if we just send 'title' object?
        // Actually, we must use the exact property name. Assuming user named it 'Name', '名称', or left it default.
        'Name': { title: [{ text: { content: data.title || slug } }] },
        'slug': { rich_text: [{ text: { content: slug } }] },
        'Excerpt': { rich_text: [{ text: { content: data.excerpt || '' } }] },
        'Published': { checkbox: data.published !== false }
      }

      if (data.date) {
        properties['Date'] = { date: { start: new Date(data.date).toISOString().split('T')[0] } }
      }
      if (data.category) {
        properties['Category'] = { rich_text: [{ text: { content: data.category } }] } // Fallback to rich_text if select fails, though it might throw validation_error if it's select
      }
      if (data.cover) {
        properties['Cover'] = { url: data.cover }
      }

      await notion.pages.create({
        parent: { data_source_id: GALLERY_DS_ID },
        properties: properties,
        children: [
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: content.trim().substring(0, 1000) || ' ' } }] } }
        ]
      })
      console.log(`    ✓ Migrated: ${data.title || slug}`)
    } catch (err) {
      console.error(`    × Failed ${slug}: ${err.message}`)
      
      // Retry with alternative casing
      try {
        console.log(`    - Retrying with alternative property names...`)
        const fallbackProps = {
          'Name': { title: [{ text: { content: data.title || slug } }] },
          'Slug': { rich_text: [{ text: { content: slug } }] }
        }
        await notion.pages.create({
          parent: { data_source_id: GALLERY_DS_ID },
          properties: fallbackProps
        })
        console.log(`    ✓ Migrated (Fallback): ${data.title || slug}`)
      } catch (e2) {}
    }
  }
}

async function migrateMore() {
  console.log('🚀 Migrating Drawer (More) items...')
  const dir = path.join(CONTENT_DIR, 'more')
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))

  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8')
    const { data, content } = matter(raw)
    const slug = f.replace(/\.md$/, '')

    try {
      const properties = {
        'Name': { title: [{ text: { content: data.title || slug } }] },
        'slug': { rich_text: [{ text: { content: slug } }] },
        'Desc': { rich_text: [{ text: { content: data.desc || data.description || '' } }] }
      }

      if (data.icon) properties['Icon'] = { rich_text: [{ text: { content: data.icon } }] }

      await notion.pages.create({
        parent: { data_source_id: MORE_DS_ID },
        properties: properties,
        children: [
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: content.trim().substring(0, 1000) || ' ' } }] } }
        ]
      })
      console.log(`    ✓ Migrated: ${data.title || slug}`)
    } catch (err) {
      console.error(`    × Failed ${slug}: ${err.message}`)
      
      try {
        console.log(`    - Retrying with alternative property names...`)
        const fallbackProps = {
          'Name': { title: [{ text: { content: data.title || slug } }] },
          'Slug': { rich_text: [{ text: { content: slug } }] }
        }
        await notion.pages.create({
          parent: { data_source_id: MORE_DS_ID },
          properties: fallbackProps
        })
        console.log(`    ✓ Migrated (Fallback): ${data.title || slug}`)
      } catch (e2) {}
    }
  }
}

async function run() {
  await migrateGallery()
  await migrateMore()
  console.log('✨ Gallery and Drawer migration completed!')
}

run()
