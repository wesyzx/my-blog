import fs from 'node:fs/promises'
import path from 'node:path'
import { loadObsidianPosts, mirrorPublishedAttachments, parseBundle, serializeBundle } from '../lib/obsidian-content.mjs'

const OUTPUT_PATH = path.join(process.cwd(), '.tmp/obsidian-preview-bundle.ts')
const PREVIEW_ATTACHMENT_ROOT = path.join(process.cwd(), '.tmp/obsidian-preview-attachments')

function blogRoot() {
  return path.resolve(process.env.OBSIDIAN_BLOG_DIR || path.join(process.cwd(), 'content/obsidian'))
}

async function main() {
  const configuredRoot = blogRoot()
  const existing = parseBundle(await fs.readFile(path.join(process.cwd(), 'lib/data-bundle.ts'), 'utf8'))
  const posts = await loadObsidianPosts({
    blogRoot: configuredRoot,
    attachmentBaseUrl: process.env.OBSIDIAN_ATTACHMENT_BASE_URL || '/obsidian',
    attachmentRoots: ['attachments'],
  })
  const attachments = await mirrorPublishedAttachments({
    blogRoot: configuredRoot,
    posts,
    destinationRoot: PREVIEW_ATTACHMENT_ROOT,
    attachmentRoots: ['attachments'],
  })
  const bundle = {
    ...existing,
    posts,
    updatedAt: new Date().toISOString(),
  }
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.writeFile(OUTPUT_PATH, serializeBundle(bundle))
  console.log(`Obsidian preview: ${posts.length} posts, ${attachments.length} attachments -> ${path.relative(process.cwd(), OUTPUT_PATH)}`)
}

main().catch((error) => {
  console.error(`Obsidian preview failed: ${error.message}`)
  process.exit(1)
})
