import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function scan() {
  console.log('🚀 Scanning Notion workspace...')
  try {
    // 搜索所有内容，不加对象过滤器
    const response = await notion.search({
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    })

    console.log('\n--- ACCESSIBLE OBJECTS ---')
    response.results.forEach(obj => {
      let title = 'Untitled'
      if (obj.object === 'database') {
        title = obj.title?.[0]?.plain_text || 'Untitled'
      } else if (obj.object === 'page') {
        title = obj.properties?.title?.title?.[0]?.plain_text 
             || obj.properties?.Name?.title?.[0]?.plain_text 
             || 'Untitled'
      }
      console.log(`- [${obj.object.toUpperCase()}] ${title} (ID: ${obj.id})`)
    })

  } catch (error) {
    console.error('Scan failed:', error)
  }
}

scan()
