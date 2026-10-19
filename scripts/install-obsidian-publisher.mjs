import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HOME = os.homedir()
const LABEL = 'com.wesyzx.obsidian-blog-publisher'
const PLIST_PATH = path.join(HOME, 'Library/LaunchAgents', `${LABEL}.plist`)
const LOG_DIR = path.join(HOME, 'Library/Logs')
const SOURCE = process.env.OBSIDIAN_BLOG_DIR?.trim()

function xml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function plist() {
  const node = process.execPath
  const script = path.join(REPO_ROOT, 'scripts/obsidian-publish.mjs')
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xml(node)}</string>
    <string>${xml(script)}</string>
  </array>
  <key>WorkingDirectory</key><string>${xml(REPO_ROOT)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>OBSIDIAN_BLOG_DIR</key><string>${xml(SOURCE)}</string>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key><string>${xml(HOME)}</string>
    <key>LANG</key><string>en_US.UTF-8</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>300</integer>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>${xml(path.join(LOG_DIR, `${LABEL}.log`))}</string>
  <key>StandardErrorPath</key><string>${xml(path.join(LOG_DIR, `${LABEL}.error.log`))}</string>
</dict>
</plist>
`
}

async function launchctl(args, { ignoreError = false } = {}) {
  try {
    return await execFileAsync('launchctl', args, { encoding: 'utf8' })
  } catch (error) {
    if (ignoreError) return null
    const detail = [error.stderr, error.stdout].filter(Boolean).join('\n').trim()
    throw new Error(`launchctl ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }
}

async function main() {
  if (!SOURCE) throw new Error('Set OBSIDIAN_BLOG_DIR to the Vault Blog directory before installing')
  const source = path.resolve(SOURCE)
  if (path.basename(source) !== 'Blog') throw new Error('OBSIDIAN_BLOG_DIR must point to the Blog directory, not the whole Vault')
  await fs.access(path.join(REPO_ROOT, 'scripts/obsidian-publish.mjs'))
  await fs.mkdir(path.dirname(PLIST_PATH), { recursive: true })
  await fs.mkdir(LOG_DIR, { recursive: true })
  await fs.writeFile(PLIST_PATH, plist(), { mode: 0o644 })

  const domain = `gui/${process.getuid()}`
  await launchctl(['bootout', `${domain}/${LABEL}`], { ignoreError: true })
  await launchctl(['bootstrap', domain, PLIST_PATH])
  await launchctl(['kickstart', '-k', `${domain}/${LABEL}`])
  console.log(`Installed ${LABEL}`)
  console.log(`Source: ${source}`)
  console.log(`Plist: ${PLIST_PATH}`)
}

main().catch((error) => {
  console.error(`Publisher install failed: ${error.message}`)
  process.exitCode = 1
})
