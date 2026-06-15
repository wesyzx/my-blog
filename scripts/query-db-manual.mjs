import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function queryDatabase(id) {
  try {
    const response = await notion.request({
      path: `databases/${id}/query`,
      method: 'POST',
      body: {}
    })
    
    if (response.results.length > 0) {
      console.log('Properties definition from a page:')
      console.log(JSON.stringify(response.results[0].properties, null, 2))
    } else {
      console.log('Database is empty.')
    }
  } catch (err) {
    console.error('Query failed:', err.message)
    console.error(err.body)
  }
}

queryDatabase('3806b772-5d3c-809d-8ad5-cb23601b6d39')
