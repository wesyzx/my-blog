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

checkDatabase('c10c587512d3473684dcad5db31b3df1')
