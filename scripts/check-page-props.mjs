import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function checkPage(id) {
  try {
    const page = await notion.pages.retrieve({ page_id: id })
    console.log(JSON.stringify(page.properties, null, 2))
  } catch (err) {
    console.error('Retrieve failed:', err.message)
    console.error(err.body)
  }
}

checkPage('3806b772-5d3c-81c3-bb31-c2ee2483be94')
