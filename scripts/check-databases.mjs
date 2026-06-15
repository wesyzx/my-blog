import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function checkDatabases() {
  console.log('🚀 Searching for all objects...')
  try {
    const response = await notion.search({})

    console.log('\n--- DATABASES FOUND ---')
    for (const obj of response.results) {
      if (obj.object === 'database') {
        const title = obj.title?.[0]?.plain_text || 'Untitled'
        console.log(`\nName: ${title}`)
        console.log(`ID: ${obj.id}`)
        console.log('Properties:', Object.keys(obj.properties).join(', '))
      }
    }
  } catch (error) {
    console.error('Check failed:', error)
  }
}

checkDatabases()
