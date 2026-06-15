import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function scan() {
  console.log('🚀 Scanning all objects to find Food Map...')
  const response = await notion.search({})
  for (const obj of response.results) {
    console.log(`- Type: ${obj.object}, ID: ${obj.id}`)
    if (obj.object === 'database') {
       console.log(`  Title: ${obj.title?.[0]?.plain_text}`)
    }
  }
}

scan()
