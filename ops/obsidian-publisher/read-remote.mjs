import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import YAML from 'yaml'
// The build pins this internal API to Commonlib 0.1.42, used by LiveSync 1.0.38.
import { DirectFileManipulator } from '@livesync/direct'
import { readContent } from '@livesync/content'
import { setGlobalLogFunction } from 'octagonal-wheels/common/logger'
import { localAttachmentTargets, publishSection, readOnlyFetch, resolveAttachment, safeBlogPath } from './read-policy.mjs'

setGlobalLogFunction(() => {})
const counters = { reads: 0, blocked: 0 }
const configPath = process.env.LIVESYNC_READER_CONFIG
const outputRoot = process.env.LIVESYNC_EXPORT_ROOT
const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

async function main() {
  if (!configPath || !outputRoot) throw new Error('Reader configuration and export directory are required')
  const options = JSON.parse(await fs.readFile(configPath, 'utf8'))
  const databaseUrl = `${options.url.replace(/\/+$/, '')}/${encodeURIComponent(options.database)}`
  const connection = new DirectFileManipulator(options, {
    fetch: readOnlyFetch(databaseUrl, counters),
  })
  let staging
  try {
    await connection.ready.promise
    const database = connection.liveSyncLocalDB.localDatabase
    const before = (await database.info()).update_seq
    const metadata = new Map()
    let scanned = 0
    const blogPaths = []
    for await (const entry of connection.enumerateAllNormalDocs({ metaOnly: true })) {
      scanned += 1
      if (entry.deleted || entry._deleted) continue
      if (/^blog\//i.test(entry.path || '')) blogPaths.push(entry.path)
      const filePath = safeBlogPath(entry.path)
      if (filePath) metadata.set(filePath, entry)
    }
    if (process.argv.includes('--audit')) {
      const documents = []
      for (const [filePath, meta] of metadata) {
        if (!publishSection(filePath)) continue
        const entry = await connection.getByMeta(meta)
        const text = readContent(entry)
        const match = typeof text === 'string' ? text.match(FRONTMATTER) : null
        documents.push({ filePath, type: entry.type, bytes: Buffer.byteLength(text),
          sha256: createHash('sha256').update(text).digest('hex'),
          frontmatter: !!match, published: match ? YAML.parse(match[1])?.published : null })
      }
      console.log(JSON.stringify({ scanned, blogPaths, documents, counters }))
      return
    }
    const root = path.resolve(outputRoot)
    await fs.mkdir(root, { recursive: true, mode: 0o700 })
    staging = await fs.mkdtemp(path.join(root, '.snapshot-'))
    const counts = { posts: 0, food: 0, gallery: 0 }
    for (const section of Object.keys(counts)) await fs.mkdir(path.join(staging, 'Blog', section), { recursive: true })
    const files = []
    const attachments = new Set()
    const read = async (meta) => {
      if (meta._conflicts?.length) throw new Error('An article or attachment has unresolved revisions')
      const raw = await database.get(meta._id, { conflicts: true })
      if (raw._rev !== meta._rev || raw._conflicts?.length) throw new Error('Source changed or has unresolved conflicts; retry later')
      const entry = await connection.getByMeta(meta)
      const content = readContent(entry)
      const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : Buffer.from(content)
      if (Number.isFinite(meta.size) && buffer.length !== meta.size) throw new Error('File size differs from synchronized metadata')
      return buffer
    }
    const save = async (filePath, buffer) => {
      const destination = path.join(staging, filePath)
      await fs.mkdir(path.dirname(destination), { recursive: true })
      await fs.writeFile(destination, buffer, { mode: 0o600 })
      files.push({ path: filePath, sha256: createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length })
    }
    for (const [filePath, meta] of [...metadata].sort(([left], [right]) => left.localeCompare(right))) {
      const section = publishSection(filePath)
      if (!section) continue
      const buffer = await read(meta)
      const source = buffer.toString('utf8')
      const match = source.match(FRONTMATTER)
      if (!match) continue
      let data
      try { data = YAML.parse(match[1]) || {} } catch { throw new Error('A Blog article has invalid frontmatter') }
      if (data.published !== true) continue
      for (const target of localAttachmentTargets(source.slice(match[0].length), data)) {
        attachments.add(resolveAttachment(target, filePath, metadata))
      }
      await save(filePath, buffer)
      counts[section] += 1
    }
    if (!Object.values(counts).some(Boolean)) throw new Error('No published content found; preserving the current site')
    for (const attachment of [...attachments].sort()) {
      const meta = metadata.get(attachment)
      if (meta.size > MAX_ATTACHMENT_SIZE) throw new Error('A referenced attachment exceeds the 50 MiB publishing limit')
      const buffer = await read(meta)
      if (buffer.length > MAX_ATTACHMENT_SIZE) throw new Error('A referenced attachment exceeds the 50 MiB publishing limit')
      await save(attachment, buffer)
    }
    const after = (await database.info()).update_seq
    if (String(before) !== String(after)) throw new Error('Database changed during export; retry after synchronization settles')
    if (counters.blocked) throw new Error('The official reader attempted a blocked write')
    const fingerprint = createHash('sha256').update(JSON.stringify(files)).digest('hex')
    await fs.writeFile(path.join(staging, 'manifest.json'), JSON.stringify({
      ...counts, attachments: attachments.size, fingerprint, files, counters,
      observedAt: new Date().toISOString(),
    }, null, 2), { mode: 0o600 })
    const current = path.join(root, 'current')
    const previous = path.join(root, 'previous')
    await fs.rm(previous, { force: true, recursive: true })
    if (await fs.stat(current).catch(() => false)) await fs.rename(current, previous)
    await fs.rename(staging, current)
    staging = null
    await fs.rm(previous, { force: true, recursive: true })
    console.log(JSON.stringify({ ...counts, attachments: attachments.size, fingerprint, counters }))
  } finally {
    if (staging) await fs.rm(staging, { recursive: true, force: true })
    await Promise.race([connection.close(), new Promise((resolve) => setTimeout(resolve, 3000))])
  }
}

main().then(() => process.exit(0)).catch(async (error) => {
  if (process.env.LIVESYNC_READER_DIAGNOSTIC_FILE) {
    await fs.writeFile(process.env.LIVESYNC_READER_DIAGNOSTIC_FILE,
      JSON.stringify({ name: error.name, message: error.message, stack: error.stack, counters }),
      { mode: 0o600 })
  }
  // Library exceptions can contain credentials or note data. Keep details off shared logs.
  console.error('LiveSync export failed; previous published snapshot preserved.')
  process.exit(1)
})
