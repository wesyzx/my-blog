import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function checkDatabase(id) {
  try {
    const db = await notion.databases.retrieve({ database_id: id })
    console.log('Full Database Object:', JSON.stringify(db, null, 2))
  } catch (err) {
    console.error('Retrieve failed:', err.message)
  }
}

checkDatabase('ee8b411c712c4ccaaac32e4c3a8d859a')
