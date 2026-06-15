import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function check(id) {
  try {
    const db = await notion.databases.retrieve({ database_id: id })
    console.log('Full Database Object:', JSON.stringify(db, null, 2))
  } catch (err) {
    console.error('Retrieve failed:', err.message)
  }
}

check('399f38da-d90b-4eb3-a665-3131ee54b3ac')
