import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function checkDatabases() {
  console.log('🚀 Checking all accessible databases...')
  try {
    const response = await notion.search({
      filter: { property: 'object', value: 'database' }
    })

    console.log('\n--- DATABASES FOUND ---')
    for (const db of response.results) {
      const title = db.title?.[0]?.plain_text || 'Untitled'
      console.log(`- [${title}] (ID: ${db.id})`)
    }
  } catch (error) {
    // If search filter fails (Notion API version issue), try broad search
    const response = await notion.search({})
    console.log('\n--- ALL OBJECTS (FALLBACK) ---')
    for (const obj of response.results) {
      if (obj.object === 'database') {
        const title = obj.title?.[0]?.plain_text || 'Untitled'
        console.log(`- [${title}] (ID: ${obj.id})`)
      }
    }
  }
}

checkDatabases()
