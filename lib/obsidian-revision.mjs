import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'

export async function obsidianRevision(root, files) {
  const records = []
  for (const file of [...new Set(files)].sort()) {
    const body = await fs.readFile(path.join(root, file))
    records.push([file.split(path.sep).join('/'), createHash('sha256').update(body).digest('hex')])
  }
  return createHash('sha256').update(JSON.stringify(records)).digest('hex')
}
