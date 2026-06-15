import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function cleanup() {
  console.log('🚀 Starting deep cleanup (JS Mode)...')
  const response = await notion.search({})
  
  for (const obj of response.results) {
    if (obj.id === '3806b772-5d3c-8072-8e95-f53909613a76') continue
    
    let title = 'Untitled'
    if (obj.object === 'database') {
      title = obj.title?.[0]?.plain_text || 'Untitled'
    } else if (obj.object === 'page') {
      title = obj.properties?.title?.title?.[0]?.plain_text 
           || obj.properties?.Name?.title?.[0]?.plain_text 
           || 'Untitled'
    }

    const keywords = ['美食', '博文', '全能', '正式', '标准', 'v2', 'Untitled', '你好，世界！']
    const shouldDelete = keywords.some(k => title.includes(k)) || title === 'Untitled'

    if (shouldDelete) {
      console.log(`  - Deleting: [${obj.object.toUpperCase()}] ${title} (${obj.id})`)
      try {
        if (obj.object === 'database') {
          // 在新版 API 中，数据库删除通常也是通过 pages.update(archived: true)
          // 或者是 patch databases
          await notion.request({ path: `databases/${obj.id}`, method: 'PATCH', body: { archived: true } })
        } else {
          await notion.pages.update({ page_id: obj.id, archived: true })
        }
      } catch (e) {
        // Fallback for different object types
        try {
          await notion.request({ path: `pages/${obj.id}`, method: 'PATCH', body: { archived: true } })
        } catch (e2) {
          console.error(`    × Final error deleting ${obj.id}: ${e2.message}`)
        }
      }
    }
  }
  console.log('\n✨ Cleanup finished! Your Notion is clean now.')
}

cleanup()
