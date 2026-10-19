import path from 'node:path'
import { attachmentCandidates } from '../../lib/obsidian-attachments.mjs'
export { localAttachmentTargets } from '../../lib/obsidian-attachments.mjs'

export function safeBlogPath(value) {
  if (typeof value !== 'string' || value.includes('\\') || value.includes('\0')) return null
  const normalized = path.posix.normalize(value)
  if (normalized !== value || !normalized.startsWith('Blog/')) return null
  return normalized
}

export function publishSection(value) {
  return safeBlogPath(value)?.match(/^Blog\/(posts|food|gallery)\/[^/]+\.md$/)?.[1] || null
}

export function readOnlyFetch(baseUrl, counters, transport = globalThis.fetch) {
  const database = new URL(baseUrl)
  return async (input, init = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
    const method = (init.method || input?.method || 'GET').toUpperCase()
    const withinDatabase = url.origin === database.origin
      && (url.pathname === database.pathname || url.pathname.startsWith(`${database.pathname}/`))
    const endpoint = url.pathname.slice(database.pathname.length)
    const allowed = withinDatabase && (
      ['GET', 'HEAD'].includes(method)
      || (method === 'POST' && ['/_all_docs', '/_bulk_get', '/_revs_diff'].includes(endpoint))
    )
    if (!allowed) {
      counters.blocked += 1
      throw new Error(`Remote write or out-of-scope request blocked (${method})`)
    }
    counters.reads += 1
    const response = await transport(input, {
      ...init,
      redirect: 'error',
      signal: init.signal || AbortSignal.timeout(30_000),
    })
    return response
  }
}

export function resolveAttachment(target, postPath, metadata) {
  for (const relative of attachmentCandidates(target, postPath.replace(/^Blog\//, ''))) {
    const candidate = `Blog/${relative}`
    if (metadata.has(candidate)) return candidate
  }
  throw new Error('A published article references a missing attachment or one outside Blog/attachments')
}
