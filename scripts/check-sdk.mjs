import { Client } from '@notionhq/client'
const notion = new Client({ auth: 'fake' })
console.log(Object.keys(notion.databases))
