import { Client } from '@notionhq/client'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const FOOD_DB_ID = '3806b7725d3c804ca58edb5c26ae914d'
const CONTENT_DIR = path.join(process.cwd(), 'content')

async function migrateFood() {
  console.log('🚀 Migrating food to database:', FOOD_DB_ID)
  
  try {
    const db = await notion.databases.retrieve({ database_id: FOOD_DB_ID })
    const existingProps = Object.keys(db.properties || {})
    console.log('  - Properties found in Notion:', existingProps.join(', ') || '(none)')

    const dir = path.join(CONTENT_DIR, 'food')
    if (!fs.existsSync(dir)) return
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))
    console.log(`  - Found ${files.length} food items locally.`)

    for (const f of files) {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8')
      const { data, content } = matter(raw)
      const slug = f.replace(/\.md$/, '')

      console.log(`  - Processing: ${data.title || slug}...`)

      const properties = {
        Name: { title: [{ text: { content: data.title || slug } }] }
      }

      const findProp = (name) => existingProps.find(p => p.toLowerCase() === name.toLowerCase())

      const slugProp = findProp('Slug')
      if (slugProp) properties[slugProp] = { rich_text: [{ text: { content: slug } }] }

      const dateProp = findProp('Date')
      if (dateProp && data.date) {
        properties[dateProp] = { date: { start: new Date(data.date).toISOString().split('T')[0] } }
      }

      const locProp = findProp('Location')
      if (locProp) properties[locProp] = { rich_text: [{ text: { content: data.location || '' } }] }

      const addrProp = findProp('Address')
      if (addrProp) properties[addrProp] = { rich_text: [{ text: { content: data.address || '' } }] }

      const lngProp = findProp('Lng')
      if (lngProp) properties[lngProp] = { number: Number(data.lng) || 0 }

      const latProp = findProp('Lat')
      if (latProp) properties[latProp] = { number: Number(data.lat) || 0 }

      const pubProp = findProp('Published')
      if (pubProp) properties[pubProp] = { checkbox: data.published !== false }

      const coverProp = findProp('Cover')
      if (coverProp && data.cover) properties[coverProp] = { url: data.cover }

      await notion.pages.create({
        parent: { database_id: FOOD_DB_ID },
        properties: properties,
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { 
              rich_text: [{ 
                type: 'text', 
                text: { content: content.trim().substring(0, 2000) || ' ' } 
              }] 
            }
          }
        ]
      })
      console.log(`    ✓ Success!`)
    }
  } catch (err) {
    console.error(`  × Error: ${err.message}`)
  }
}

migrateFood()
