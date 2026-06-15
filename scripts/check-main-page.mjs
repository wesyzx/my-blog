import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const PARENT_PAGE_ID = '3806b7725d3c80728e95f53909613a76'

async function checkMainPage() {
  try {
    const blocks = await notion.blocks.children.list({ block_id: PARENT_PAGE_ID })
    for (const b of blocks.results) {
      if (b.type === 'child_database') {
        console.log(`[Database] Title: ${b.child_database.title}, ID: ${b.id}`)
        try {
          const db = await notion.databases.retrieve({ database_id: b.id })
          if (db.data_sources && db.data_sources.length > 0) {
            console.log(`  -> Data Source ID: ${db.data_sources[0].id}`)
          }
        } catch (e) {
          console.log(`  -> Error retrieving details: ${e.message}`)
        }
      }
    }
  } catch (err) {
    console.error('Retrieve failed:', err.message)
  }
}

checkMainPage()
