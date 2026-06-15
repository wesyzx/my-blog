import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function queryDatabase(id) {
  try {
    const response = await notion.databases.query({ database_id: id })
    if (response.results.length > 0) {
      console.log('--- FOUND PAGE IN DB ---')
      console.log('Properties definition from a page:')
      console.log(JSON.stringify(response.results[0].properties, null, 2))
    } else {
      console.log('Database is empty. Creating a dummy page to read schema...')
      const newPage = await notion.pages.create({
        parent: { database_id: id },
        properties: {} // Let Notion use default title if possible, or we must provide title.
      })
      console.log('Created dummy page:', newPage.id)
    }
  } catch (err) {
    console.error('Query/Create failed:', err.message)
    console.error(err.body)
  }
}

queryDatabase('3806b772-5d3c-809d-8ad5-cb23601b6d39')
