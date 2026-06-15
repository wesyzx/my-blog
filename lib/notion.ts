import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'

/**
 * Notion 客户端初始化
 * 
 * 环境变量要求：
 * NOTION_TOKEN: 你的 Internal Integration Token
 */
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

const n2m = new NotionToMarkdown({ notionClient: notion })

/**
 * 根据页面 ID 获取 Notion 页面内容并转换为 Markdown
 * @param pageId Notion 页面 ID
 */
export async function getPageContent(pageId: string): Promise<string> {
  if (!process.env.NOTION_TOKEN) {
    console.warn('NOTION_TOKEN is missing. Using empty content.')
    return ''
  }

  try {
    const mdblocks = await n2m.pageToMarkdown(pageId)
    const mdString = n2m.toMarkdownString(mdblocks)
    return mdString.parent
  } catch (error) {
    console.error(`Error fetching Notion page ${pageId}:`, error)
    return ''
  }
}

/**
 * 获取数据库条目（通用方法）
 * @param databaseId 数据库 ID
 * @param filter 过滤条件
 */
export async function getDatabaseItems(databaseId: string, filter?: any) {
  if (!process.env.NOTION_TOKEN) {
    return []
  }

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: filter,
      sorts: [
        {
          property: 'date',
          direction: 'descending',
        },
      ],
    })
    return response.results
  } catch (error) {
    console.error(`Error querying Notion database ${databaseId}:`, error)
    return []
  }
}
