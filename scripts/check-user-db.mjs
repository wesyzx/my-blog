import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function checkDatabase(id) {
  try {
    const db = await notion.databases.retrieve({ database_id: id })
    console.log(JSON.stringify(db, null, 2))
  } catch (err) {
    console.error('Retrieve failed:', err.message)
  }
}

checkDatabase('3806b772-5d3c-809d-8ad5-cb23601b6d39')
