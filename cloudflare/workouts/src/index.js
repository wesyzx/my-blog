import { normalizeActivity } from './domain.js'
import { createAndStoreSnapshot, getCursor, recordSync, upsertActivities } from './storage.js'

const MAX_INGEST_ACTIVITIES = 500
const MAX_JSON_BYTES = 2_000_000

function json(data, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function publicHeaders(env) {
  return {
    'access-control-allow-origin': env.PUBLIC_ORIGIN || '*',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'x-content-type-options': 'nosniff',
  }
}

async function authorized(request, env) {
  if (!env.INGEST_TOKEN) return false
  const provided = request.headers.get('authorization') || ''
  const expected = `Bearer ${env.INGEST_TOKEN}`
  const encoder = new TextEncoder()
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ])
  if (typeof crypto.subtle.timingSafeEqual === 'function') {
    return crypto.subtle.timingSafeEqual(providedHash, expectedHash)
  }

  const providedBytes = new Uint8Array(providedHash)
  const expectedBytes = new Uint8Array(expectedHash)
  let mismatch = 0
  for (let index = 0; index < providedBytes.length; index += 1) {
    mismatch |= providedBytes[index] ^ expectedBytes[index]
  }
  return mismatch === 0
}

async function readBoundedJson(body, contentLength) {
  if (contentLength && Number(contentLength) > MAX_JSON_BYTES) throw new Error('Payload exceeds 2 MB')
  if (!body) throw new Error('Payload is required')

  const reader = body.getReader()
  const chunks = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_JSON_BYTES) {
      await reader.cancel('Payload exceeds 2 MB')
      throw new Error('Payload exceeds 2 MB')
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder().decode(bytes))
}

async function parsePayload(request) {
  const payload = await readBoundedJson(request.body, request.headers.get('content-length'))
  const activities = Array.isArray(payload) ? payload : payload.activities
  if (!Array.isArray(activities)) throw new Error('Payload must contain an activities array')
  if (activities.length > MAX_INGEST_ACTIVITIES) throw new Error(`At most ${MAX_INGEST_ACTIVITIES} activities may be ingested at once`)
  return { payload, activities }
}

async function ingest(request, env, defaultSource = 'manual') {
  if (!await authorized(request, env)) return json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { payload, activities: rawActivities } = await parsePayload(request)
    const source = String(payload.source || defaultSource)
    const activities = rawActivities.map((activity) => normalizeActivity(activity, source))
    await upsertActivities(env.DB, activities)
    await recordSync(env.DB, source, { cursor: payload.cursor || null, status: 'ok' })
    const snapshot = await createAndStoreSnapshot(env)
    return json({ ok: true, ingested: activities.length, lastUpdated: snapshot.lastUpdated })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid payload' }, { status: 400 })
  }
}

async function syncSource(env) {
  const source = env.SOURCE_NAME || 'upstream'
  if (!env.SOURCE_URL) {
    const snapshot = await createAndStoreSnapshot(env)
    return { ok: true, skipped: true, reason: 'SOURCE_URL is not configured', lastUpdated: snapshot.lastUpdated }
  }

  const cursor = await getCursor(env.DB, source)
  const url = new URL(env.SOURCE_URL)
  if (cursor) url.searchParams.set('cursor', cursor)
  const headers = new Headers({ accept: 'application/json' })
  if (env.SOURCE_BEARER_TOKEN) headers.set('authorization', `Bearer ${env.SOURCE_BEARER_TOKEN}`)

  try {
    const response = await fetch(url, { headers })
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`)
    const payload = await readBoundedJson(response.body, response.headers.get('content-length'))
    const rawActivities = Array.isArray(payload) ? payload : payload.activities
    if (!Array.isArray(rawActivities)) throw new Error('Source payload does not contain an activities array')
    if (rawActivities.length > MAX_INGEST_ACTIVITIES) throw new Error(`Source returned more than ${MAX_INGEST_ACTIVITIES} activities`)

    const activities = rawActivities.map((activity) => normalizeActivity(activity, source))
    await upsertActivities(env.DB, activities)
    await recordSync(env.DB, source, { cursor: payload.cursor || null, status: 'ok' })
    const snapshot = await createAndStoreSnapshot(env)
    return { ok: true, synced: activities.length, lastUpdated: snapshot.lastUpdated }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error'
    await recordSync(env.DB, source, { cursor, status: 'error', error: message })
    throw error
  }
}

async function serveSnapshot(request, env, key = env.SNAPSHOT_KEY || 'v1/workouts.json') {
  let object = await env.SNAPSHOTS.get(key)
  if (!object) {
    await createAndStoreSnapshot(env)
    object = await env.SNAPSHOTS.get(key)
  }
  if (!object) return json({ error: 'Snapshot unavailable' }, { status: 503, headers: publicHeaders(env) })

  const headers = new Headers(publicHeaders(env))
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400')
  if (request.headers.get('if-none-match') === object.httpEtag) return new Response(null, { status: 304, headers })
  return new Response(request.method === 'HEAD' ? null : object.body, { status: 200, headers })
}

async function health(env) {
  const object = await env.SNAPSHOTS.head(env.SNAPSHOT_KEY || 'v1/workouts.json')
  return json({
    ok: Boolean(object),
    snapshot: object ? {
      lastUpdated: object.customMetadata?.lastUpdated || object.uploaded.toISOString(),
      size: object.size,
      etag: object.httpEtag,
    } : null,
  }, { status: object ? 200 : 503, headers: publicHeaders(env) })
}

const worker = {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)

      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: publicHeaders(env) })
      if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/v1/workouts.json') return await serveSnapshot(request, env)
      if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/v1/routes.json') return await serveSnapshot(request, env, env.ROUTES_SNAPSHOT_KEY || 'v1/routes.json')
      if (request.method === 'GET' && url.pathname === '/health') return await health(env)
      if (request.method === 'POST' && url.pathname === '/internal/ingest') return await ingest(request, env)
      if (request.method === 'POST' && url.pathname === '/internal/healthkit') return await ingest(request, env, 'apple-health')
      if (request.method === 'POST' && url.pathname === '/internal/sync') {
        if (!await authorized(request, env)) return json({ error: 'Unauthorized' }, { status: 401 })
        try {
          return json(await syncSource(env))
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : 'Sync failed' }, { status: 502 })
        }
      }

      return json({ error: 'Not found' }, { status: 404, headers: publicHeaders(env) })
    } catch (error) {
      console.error(JSON.stringify({
        message: 'Unhandled workout API error',
        method: request.method,
        path: new URL(request.url).pathname,
        error: error instanceof Error ? error.message : String(error),
      }))
      return json({ error: 'Internal server error' }, { status: 500, headers: publicHeaders(env) })
    }
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(syncSource(env).catch((error) => {
      console.error(JSON.stringify({
        message: 'Scheduled workout sync failed',
        error: error instanceof Error ? error.message : String(error),
      }))
      throw error
    }))
  },
}

export default worker
