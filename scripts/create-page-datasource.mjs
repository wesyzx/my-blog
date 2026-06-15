import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function createPage(id) {
  try {
    const newPage = await notion.pages.create({
      parent: { data_source_id: id },
      properties: {}
    })
    console.log('Created page in Posts:', newPage.id)
    console.log(JSON.stringify(newPage.properties, null, 2))
  } catch (err) {
    console.error('Create failed:', err.message)
    console.error(err.body)
  }
}

// 6bff5b12-623c-4404-9e80-66c4b77f82eb might be Posts
createPage('6bff5b12-623c-4404-9e80-66c4b77f82eb')
