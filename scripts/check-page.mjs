import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function checkPage(id) {
  try {
    const page = await notion.pages.retrieve({ page_id: id })
    console.log('--- PAGE FOUND ---')
    console.log(JSON.stringify(page, null, 2))
    
    // 检查子块，看是否有 database
    const blocks = await notion.blocks.children.list({ block_id: id })
    console.log('\n--- PAGE CHILDREN ---')
    blocks.results.forEach(b => {
      console.log(`Type: ${b.type}, ID: ${b.id}`)
      if (b.type === 'child_database') {
        console.log(`  => Found database! Title: ${b.child_database.title}`)
      }
    })
  } catch (err) {
    console.error('Retrieve failed:', err.message)
  }
}

checkPage('3806b7725d3c8072935ce9ece41f7254')
