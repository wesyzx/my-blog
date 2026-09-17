import assert from 'node:assert/strict'
import test from 'node:test'
import worker from '../src/index.js'

const SNAPSHOT = JSON.stringify({
  schemaVersion: 1,
  lastUpdated: '2026-09-16T08:00:00.000Z',
  summary: {},
  heatmap: [],
  activities: [],
})

function object(body = SNAPSHOT) {
  return {
    body,
    size: body.length,
    httpEtag: '"test-etag"',
    uploaded: new Date('2026-09-16T08:00:00.000Z'),
    customMetadata: { lastUpdated: '2026-09-16T08:00:00.000Z' },
    writeHttpMetadata(headers) {
      headers.set('content-type', 'application/json; charset=utf-8')
    },
  }
}

function env() {
  const stored = object()
  return {
    PUBLIC_ORIGIN: 'https://guanyan.me',
    SNAPSHOT_KEY: 'v1/workouts.json',
    SNAPSHOTS: {
      async get() { return stored },
      async head() { return stored },
    },
  }
}

test('serves the public snapshot with cache and CORS headers', async () => {
  const response = await worker.fetch(new Request('https://workouts.example/v1/workouts.json'), env())
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('etag'), '"test-etag"')
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://guanyan.me')
  assert.match(response.headers.get('cache-control'), /s-maxage=21600/)
  assert.deepEqual(await response.json(), JSON.parse(SNAPSHOT))
})

test('honors an R2 etag conditional request', async () => {
  const response = await worker.fetch(new Request('https://workouts.example/v1/workouts.json', {
    headers: { 'if-none-match': '"test-etag"' },
  }), env())
  assert.equal(response.status, 304)
})

test('serves the complete route snapshot endpoint', async () => {
  const response = await worker.fetch(new Request('https://workouts.example/v1/routes.json'), env())
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), JSON.parse(SNAPSHOT))
})

test('reports snapshot health without exposing activities', async () => {
  const response = await worker.fetch(new Request('https://workouts.example/health'), env())
  const data = await response.json()
  assert.equal(response.status, 200)
  assert.equal(data.ok, true)
  assert.equal(data.snapshot.lastUpdated, '2026-09-16T08:00:00.000Z')
  assert.equal('activities' in data, false)
})

test('rejects an unauthenticated ingest request', async () => {
  const response = await worker.fetch(new Request('https://workouts.example/internal/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ activities: [] }),
  }), env())
  assert.equal(response.status, 401)
})

test('compares a configured ingest token without accepting the wrong value', async () => {
  const testEnv = env()
  testEnv.INGEST_TOKEN = 'expected-token'
  const response = await worker.fetch(new Request('https://workouts.example/internal/ingest', {
    method: 'POST',
    headers: {
      authorization: 'Bearer wrong-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ activities: [] }),
  }), testEnv)
  assert.equal(response.status, 401)
})
