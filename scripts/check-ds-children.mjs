import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function checkPages() {
  try {
    const blocks = await notion.blocks.children.list({ block_id: '6bff5b12-623c-4404-9e80-66c4b77f82eb' })
    console.log('Posts DS Children:', blocks.results.length)
    if (blocks.results.length > 0) {
        console.log('First child:', blocks.results[0].id)
    }
  } catch (e) {
    console.log('Error listing children of DS:', e.message)
  }
}

checkPages()
