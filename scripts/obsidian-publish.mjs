import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { loadObsidianPosts, mirrorPublishedAttachments } from '../lib/obsidian-content.mjs'

const execFileAsync = promisify(execFile)
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
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
  const unexpected = lines.filter((line) => {
    const changedPath = line.slice(3)
    return changedPath !== 'content/obsidian' && !changedPath.startsWith('content/obsidian/')
  })
  if (unexpected.length > 0) {
    throw new Error(`Refusing to publish while other repository files are dirty:\n${unexpected.join('\n')}`)
  }
}

async function stagePublish(source) {
  const posts = await loadObsidianPosts({
    blogRoot: source,
    attachmentBaseUrl: '/obsidian',
    attachmentRoots: ['attachments'],
  })
  if (posts.length === 0) {
    throw new Error('The Vault Blog directory has no published posts; refusing to erase the published copy')
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
    // The attachment mirror prunes everything it does not own, so create posts afterwards.
    await fs.mkdir(path.join(staging, 'posts'), { recursive: true })
    for (const post of posts) {
      if (!post.sourceFile) throw new Error(`Missing source file metadata for ${post.slug}`)
      await fs.copyFile(post.sourceFile, path.join(staging, 'posts', path.basename(post.sourceFile)))
    }
    return { posts, attachments, staging }
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true })
    throw error
  }
}

async function replaceDestination(staging) {
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
  const { stdout: staged } = await git(['diff', '--cached', '--name-only'])
  const stagedPaths = staged.split('\n').filter(Boolean)
  if (stagedPaths.length === 0) return false
  assertOnlyPublishPathsChanged(stagedPaths)

  const message = `publish: sync Obsidian blog (${postCount} ${postCount === 1 ? 'post' : 'posts'})`
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
  const { stdout } = await git(['rev-list', '--count', '@{upstream}..HEAD'])
  if (Number.parseInt(stdout.trim(), 10) === 0) return
  const { stdout: branch } = await git(['symbolic-ref', '--short', 'HEAD'])
  if (branch.trim() !== 'main') throw new Error(`Automatic publishing only supports main, current branch is ${branch.trim()}`)
  await git(['push', 'origin', 'HEAD:main'])
  console.log('Pushed previously committed Obsidian changes')
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
    if (!noPush) await pushExistingCommit()

    console.log(`Publishing Obsidian Blog from ${source}`)
    const result = await stagePublish(source)
    staging = result.staging
    console.log(`Validated ${result.posts.length} published posts and ${result.attachments.length} referenced attachments`)

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
