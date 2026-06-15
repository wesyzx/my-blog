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
    console.log('Created dummy page in Food DS:', newPage.id)
    console.log(JSON.stringify(newPage.properties, null, 2))
    // Clean up
    await notion.pages.update({ page_id: newPage.id, archived: true })
  } catch (err) {
    console.error('Create failed:', err.message)
    console.error(err.body)
  }
}

createPage('3806b772-5d3c-8046-88b8-000b3b624968')
