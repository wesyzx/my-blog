import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

const ids = [
  '3e08e0d1-c65c-450b-a453-8672e73cf6b6',
  '6bff5b12-623c-4404-9e80-66c4b77f82eb',
  '3806b772-5d3c-8060-94a4-000b58a9d425',
  '3806b772-5d3c-80a6-858d-000bae512f1c',
  '3806b772-5d3c-8081-8570-000be39b18bd'
]

async function probe() {
  for (const id of ids) {
    try {
      const db = await notion.databases.retrieve({ database_id: id })
      console.log(`- ID: ${id}, Title: ${db.title?.[0]?.plain_text || 'Untitled'}`)
    } catch (e) {
      // ignore
    }
  }
}

probe()
