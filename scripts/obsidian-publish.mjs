import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { loadObsidianContent, mirrorPublishedAttachments } from '../lib/obsidian-content.mjs'

const execFileAsync = promisify(execFile)
const REPO_ROOT = path.resolve(process.env.OBSIDIAN_PUBLISH_REPO || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
const DESTINATION_ROOT = path.join(REPO_ROOT, 'content/obsidian')
const TEMP_ROOT = path.join(REPO_ROOT, '.tmp')
const LOCK_PATH = path.join(TEMP_ROOT, 'obsidian-publish.lock')
const LOCK_STALE_MS = 30 * 60 * 1000
const git = async (args, options = {}) => {
  try {
    return await execFileAsync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 90_000,
      ...options,
    })
  } catch (error) {
    const detail = [error.stderr, error.stdout].filter(Boolean).join('\n').trim()
    throw new Error(`git ${args.join(' ')} failed${detail ? `:\n${detail}` : ''}`)
  }
}

function sourceRoot() {
  const configured = process.env.OBSIDIAN_BLOG_DIR?.trim()
  if (!configured) {
    throw new Error('OBSIDIAN_BLOG_DIR is required (point it at the Vault Blog directory, not the whole Vault)')
  }
  const source = path.resolve(configured)
  if (path.basename(source) !== 'Blog') {
    throw new Error(`Refusing to publish from "${source}": the source directory must be named Blog`)
  }
  if (source === DESTINATION_ROOT || source.startsWith(`${DESTINATION_ROOT}${path.sep}`)) {
    throw new Error('OBSIDIAN_BLOG_DIR must point to the Vault Blog directory, not the repository publish target')
  }
  return source
}

async function pathExists(target) {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function acquireLock() {
  await fs.mkdir(path.dirname(LOCK_PATH), { recursive: true })
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await fs.open(LOCK_PATH, 'wx')
      await handle.writeFile(`${process.pid}\n`)
      return async () => {
        await handle.close()
        await fs.unlink(LOCK_PATH).catch(() => {})
      }
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      const stat = await fs.stat(LOCK_PATH).catch(() => null)
      const stale = stat && Date.now() - stat.mtimeMs > LOCK_STALE_MS
      if (!stale || attempt > 0) throw new Error(`Publish lock is already held: ${LOCK_PATH}`)
      await fs.unlink(LOCK_PATH)
    }
  }
  throw new Error(`Unable to acquire publish lock: ${LOCK_PATH}`)
}

async function repositoryStatus() {
  const { stdout } = await git(['status', '--porcelain=v1', '-z', '--untracked-files=all'])
  const records = stdout.split('\0').filter(Boolean)
  const changedPaths = []
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    const status = record.slice(0, 2)
    changedPaths.push(record.slice(3))
    if (status.includes('R') || status.includes('C')) {
      const originalPath = records[index + 1]
      if (originalPath) changedPaths.push(originalPath)
      index += 1
    }
  }
  return changedPaths
}

function assertOnlyPublishPathsChanged(lines) {
  const unexpected = lines.filter((changedPath) => {
    return changedPath !== 'content/obsidian' && !changedPath.startsWith('content/obsidian/')
  })
  if (unexpected.length > 0) {
    throw new Error(`Refusing to publish while other repository files are dirty:\n${unexpected.join('\n')}`)
  }
}

async function stagePublish(source) {
  const content = await loadObsidianContent({
    blogRoot: source,
    attachmentBaseUrl: '/obsidian',
    attachmentRoots: ['attachments'],
  })
  const posts = Object.values(content).flat()
  if (posts.length === 0) {
    throw new Error('The Vault Blog directory has no published content; refusing to erase the published copy')
  }
  for (const section of ['posts', 'food', 'gallery']) {
    const previous = await fs.readdir(path.join(DESTINATION_ROOT, section)).catch((error) => {
      if (error.code === 'ENOENT') return []
      throw error
    })
    if (!content[section].length && previous.some((file) => file.endsWith('.md'))) {
      throw new Error(`Refusing to empty the existing ${section} publication without manual review`)
    }
  }

  await fs.mkdir(TEMP_ROOT, { recursive: true })
  const staging = await fs.mkdtemp(path.join(TEMP_ROOT, 'obsidian-publish-'))
  try {
    const attachments = await mirrorPublishedAttachments({
      blogRoot: source,
      posts,
      destinationRoot: staging,
      attachmentRoots: ['attachments'],
    })
    // The attachment mirror prunes everything it does not own, so create content afterwards.
    for (const section of ['posts', 'food', 'gallery']) await fs.mkdir(path.join(staging, section), { recursive: true })
    for (const post of posts) {
      if (!post.sourceFile) throw new Error(`Missing source file metadata for ${post.slug}`)
      await fs.copyFile(post.sourceFile, path.join(staging, path.relative(source, post.sourceFile)))
    }
    return { posts, content, attachments, staging }
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true })
    throw error
  }
}

async function replaceDestination(staging) {
  await fs.mkdir(path.dirname(DESTINATION_ROOT), { recursive: true })
  const backup = `${staging}-previous`
  const hadDestination = await pathExists(DESTINATION_ROOT)
  if (hadDestination) await fs.rename(DESTINATION_ROOT, backup)
  try {
    await fs.rename(staging, DESTINATION_ROOT)
  } catch (error) {
    if (hadDestination) await fs.rename(backup, DESTINATION_ROOT).catch(() => {})
    throw error
  }
  if (hadDestination) await fs.rm(backup, { recursive: true, force: true })
}

async function commitAndPush(postCount, { noPush = false } = {}) {
  const status = await repositoryStatus()
  if (status.length === 0) {
    return false
  }
  assertOnlyPublishPathsChanged(status)
  await git(['add', '--', 'content/obsidian'])
  const { stdout: staged } = await git(['diff', '--cached', '--name-only', '-z'])
  const stagedPaths = staged.split('\0').filter(Boolean)
  if (stagedPaths.length === 0) return false
  assertOnlyPublishPathsChanged(stagedPaths)

  const message = `publish: sync Obsidian content (${postCount} ${postCount === 1 ? 'entry' : 'entries'})`
  await git(['commit', '-m', message])
  if (noPush) {
    console.log(`Committed ${message}; push skipped by --no-push`)
    return true
  }

  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await git(['push', 'origin', 'HEAD:main'])
      console.log(`Pushed ${message}`)
      return true
    } catch (error) {
      lastError = error
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 5000))
    }
  }
  throw lastError
}

async function pushExistingCommit() {
  const { stdout } = await git(['rev-list', '--count', 'origin/main..HEAD'])
  if (Number.parseInt(stdout.trim(), 10) === 0) return
  const { stdout: changes } = await git(['log', '--format=', '--name-only', '-z', 'origin/main..HEAD'])
  assertOnlyPublishPathsChanged(changes.split('\0').flatMap((value) => value.split('\n')).filter(Boolean))
  await git(['push', 'origin', 'HEAD:main'])
  console.log('Pushed previously committed Obsidian changes')
}

async function updateRepository() {
  const { stdout: branch } = await git(['symbolic-ref', '--short', 'HEAD'])
  if (branch.trim() !== 'main') throw new Error('Automatic publishing requires the main branch')
  await git(['fetch', 'origin', 'main'])
  const { stdout: counts } = await git(['rev-list', '--left-right', '--count', 'HEAD...origin/main'])
  const [ahead, behind] = counts.trim().split(/\s+/).map(Number)
  if (ahead && behind) throw new Error('Repository diverged; manual reconciliation required')
  if (behind) await git(['merge', '--ff-only', 'origin/main'])
  await pushExistingCommit()
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const noPush = process.argv.includes('--no-push')
  const source = sourceRoot()
  const release = await acquireLock()
  let staging
  try {
    const before = await repositoryStatus()
    assertOnlyPublishPathsChanged(before)
    if (!noPush && !dryRun) await updateRepository()

    console.log(`Publishing Obsidian Blog from ${source}`)
    const result = await stagePublish(source)
    staging = result.staging
    console.log(`Validated ${result.posts.length} published entries and ${result.attachments.length} referenced attachments`)

    if (dryRun) {
      console.log('Dry run complete; repository was not changed')
      return
    }

    await replaceDestination(staging)
    staging = null
    await commitAndPush(result.posts.length, { noPush })
  } finally {
    if (staging) await fs.rm(staging, { recursive: true, force: true })
    await release()
  }
}

main().catch((error) => {
  console.error(`Obsidian publish failed: ${error.message}`)
  process.exitCode = 1
})
