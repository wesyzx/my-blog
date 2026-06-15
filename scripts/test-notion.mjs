import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const n2m = new NotionToMarkdown({ notionClient: notion })

async function test() {
  const pageId = process.env.NOTION_PAGE_ID_ABOUT
  if (!pageId) {
    console.error('NOTION_PAGE_ID_ABOUT is missing')
    return
  }
  console.log('Testing connection for page:', pageId)
  try {
    const mdblocks = await n2m.pageToMarkdown(pageId)
    const mdString = n2m.toMarkdownString(mdblocks)
    console.log('--- CONTENT START ---')
    console.log(mdString.parent)
    console.log('--- CONTENT END ---')
  } catch (error) {
    console.error('Failed:', error)
  }
}

test()
