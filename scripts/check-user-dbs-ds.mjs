import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function checkDatabases() {
  const ids = [
    'c10c5875-12d3-4736-84dc-ad5db31b3df1', // 博文列表
    '3806b772-5d3c-8009-8eea-d632c71bbe68'  // 测试美食
  ]

  for (const id of ids) {
    try {
      const db = await notion.databases.retrieve({ database_id: id })
      console.log(`\n--- DB: ${db.title[0]?.plain_text} ---`)
      console.log('ID:', db.id)
      console.log('Data Sources:', JSON.stringify(db.data_sources, null, 2))
    } catch (e) {
      console.error('Error:', e.message)
    }
  }
}

checkDatabases()
