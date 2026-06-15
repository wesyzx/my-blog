import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function probeDS(id, name) {
  console.log(`\nProbing ${name} DS...`)
  try {
    const newPage = await notion.pages.create({
      parent: { data_source_id: id },
      properties: {}
    })
    console.log(`Properties in ${name}:`)
    console.log(JSON.stringify(newPage.properties, null, 2))
    await notion.pages.update({ page_id: newPage.id, archived: true })
  } catch (err) {
    console.error(`Probe failed for ${name}:`, err.message)
  }
}

async function run() {
  await probeDS('64bd6b1e-26f0-4994-9c11-1232e3590807', 'Gallery')
  await probeDS('70208dcf-6091-4e54-af59-cf0b21ada509', 'Drawer')
}

run()
