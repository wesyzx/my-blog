import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { normalizeActivity } from '../src/domain.js'
import { attachRoute, createAndStoreSnapshot, upsertActivities } from '../src/storage.js'
import worker from '../src/index.js'

// Run the real D1 SQL against SQLite when the local Node runtime provides it.
let DatabaseSync
try {
  ;({ DatabaseSync } = await import('node:sqlite'))
} catch {
  // Node 20 can still run the existing domain and request tests.
}

const NOW = new Date('2026-10-14T08:00:00Z')
const BASE = {
  id: 'stable-workout-id',
  type: 'Run',
  startedAt: '2026-10-14T06:30:00+08:00',
  localDate: '2026-10-14',
  distanceMeters: 5000,
  durationSeconds: 1800,
  elevationGainMeters: 32,
  activeEnergyKcal: 350,
  averageHeartRateBpm: 150,
  route: 'encoded-route',
  publishRoute: true,
}

function environment(t) {
  const sqlite = new DatabaseSync(':memory:')
  t.after(() => sqlite.close())
  for (const migration of [
    '0001_init.sql', '0002_workout_metrics.sql', '0003_activity_categories.sql',
    '0004_historical_stretch.sql', '0005_historical_walk.sql', '0006_flights_climbed.sql',
  ]) {
    sqlite.exec(readFileSync(new URL(`../migrations/${migration}`, import.meta.url), 'utf8'))
  }
  const objects = new Map()
  return {
    sqlite,
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            return {
              async run() { return sqlite.prepare(sql).run(...values) },
              async first() { return sqlite.prepare(sql).get(...values) },
            }
          },
          async all() { return { results: sqlite.prepare(sql).all() } },
        }
      },
      async batch(statements) {
        sqlite.exec('BEGIN')
        try {
          const result = []
          for (const statement of statements) result.push(await statement.run())
          sqlite.exec('COMMIT')
          return result
        } catch (error) {
          sqlite.exec('ROLLBACK')
          throw error
        }
      },
    },
    SNAPSHOTS: {
      async put(key, body) { objects.set(key, JSON.parse(body)) },
    },
    objects,
    INGEST_TOKEN: 'local-test-token',
  }
}

async function insert(env, input) {
  await upsertActivities(env.DB, [normalizeActivity(input, 'apple-health', NOW)])
}

test('summary retries preserve the route, absent metrics and local date', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  await insert(env, BASE)
  await insert(env, {
    id: BASE.id,
    startedAt: '2026-10-13T22:30:00Z',
    durationSeconds: 1900,
    activeEnergyKcal: 360,
  })
  const snapshot = await createAndStoreSnapshot(env, NOW)
  assert.equal(snapshot.activities.length, 1)
  assert.equal(snapshot.activities[0].type, 'Run')
  assert.equal(snapshot.activities[0].distanceMeters, 5000)
  assert.equal(snapshot.activities[0].durationSeconds, 1900)
  assert.equal(snapshot.activities[0].elevationGainMeters, 32)
  assert.equal(snapshot.activities[0].activeEnergyKcal, 360)
  assert.equal(snapshot.activities[0].averageHeartRateBpm, 150)
  assert.equal(snapshot.activities[0].route, BASE.route)
  assert.equal(snapshot.activities[0].pace, 380)
  assert.equal(snapshot.heatmap[0].date, '2026-10-14')
  assert.equal(snapshot.routes.length, 1)
  assert.equal('providedFields' in snapshot.activities[0], false)
})

test('stair flights and steps are stored and never overwritten by an absent retry', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  await insert(env, {
    id: 'stair-fields',
    type: 'Stairs',
    startedAt: '2026-10-14T06:30:00+08:00',
    durationSeconds: 1800,
    flightsClimbed: 36,
    stepsClimbed: 540,
  })
  await insert(env, { id: 'stair-fields', startedAt: '2026-10-14T06:30:00+08:00', durationSeconds: 1900 })
  const row = env.sqlite.prepare('SELECT flights_climbed, steps_climbed FROM activities').get()
  assert.equal(row.flights_climbed, 36)
  assert.equal(row.steps_climbed, 540)
  const snapshot = await createAndStoreSnapshot(env, NOW)
  assert.equal(snapshot.activities[0].flightsClimbed, 36)
  assert.equal(snapshot.activities[0].stepsClimbed, 540)
  assert.equal(snapshot.activities[0].elevationGainMeters, 0)
})

test('preserves the source sport and reclassifies when a partial update supplies distance', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  await insert(env, { ...BASE, type: 'Walking', distanceMeters: 0 })
  await insert(env, { id: BASE.id, startedAt: BASE.startedAt, distanceMeters: 5000 })
  const row = env.sqlite.prepare('SELECT type, source_type FROM activities').get()
  assert.equal(row.type, 'Hike')
  assert.equal(row.source_type, 'Walking')
  let snapshot = await createAndStoreSnapshot(env, NOW)
  assert.equal(snapshot.activities[0].type, 'Hike')
  assert.equal(snapshot.activities[0].route, BASE.route)
  await insert(env, { id: BASE.id, type: 'Walking', startedAt: BASE.startedAt })
  assert.equal(env.sqlite.prepare('SELECT type FROM activities').get().type, 'Hike')
  await insert(env, { id: BASE.id, startedAt: BASE.startedAt, distanceMeters: 4999 })
  snapshot = await createAndStoreSnapshot(env, NOW)
  assert.equal(snapshot.activities[0].type, 'Walk')
})

test('new uploads distinguish cooldown and jump rope while retaining training subtypes', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  for (const [id, type] of [['stretch', 'Cooldown'], ['rope', 'Jump Rope'], ['core', 'Core Training']]) {
    await insert(env, { ...BASE, id, type })
  }
  const snapshot = await createAndStoreSnapshot(env, NOW)
  assert.equal(snapshot.activities.find((item) => item.id.endsWith(':stretch')).type, 'Stretch')
  assert.equal(snapshot.activities.find((item) => item.id.endsWith(':rope')).type, 'JumpRope')
  assert.equal(snapshot.activities.find((item) => item.id.endsWith(':core')).type, 'Workout')
  assert.equal(env.sqlite.prepare("SELECT source_type FROM activities WHERE source_activity_id = 'core'").get().source_type, 'Core Training')
})

test('owner-revised historical classifications change only the two matching records', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  const targets = [
    ['8A47CD5D-3174-4EB3-B8DC-FB753DEE5E1B', '2026-03-24T08:33:53.451Z'],
    ['74F7CDF2-2FA9-41EB-B70F-B625F973B9E0', '2026-03-23T02:09:19.931Z'],
  ]
  for (const [id, startedAt] of [...targets, ['unrelated-training', BASE.startedAt]]) {
    await insert(env, { ...BASE, id, startedAt, type: 'Workout', distanceMeters: 969 })
  }
  const before = env.sqlite.prepare('SELECT * FROM activities ORDER BY id').all()
  const migration = readFileSync(new URL('../migrations/0004_historical_stretch.sql', import.meta.url), 'utf8')
  env.sqlite.exec(migration)
  env.sqlite.exec(migration)
  const after = env.sqlite.prepare('SELECT * FROM activities ORDER BY id').all()
  assert.deepEqual(after.map((row) => ({ ...row })), before.map((row) => targets.some(([id]) => row.id === `apple-health:${id}`)
    ? { ...row, type: 'Stretch', source_type: 'Stretch' } : { ...row }))
  const snapshot = await createAndStoreSnapshot(env, NOW)
  for (const [id] of targets) {
    assert.equal(snapshot.activities.find((item) => item.id === `apple-health:${id}`).type, 'Stretch')
  }
  assert.equal(snapshot.activities.find((item) => item.id.endsWith(':unrelated-training')).type, 'Workout')
  const walkMigration = readFileSync(new URL('../migrations/0005_historical_walk.sql', import.meta.url), 'utf8')
  env.sqlite.exec(walkMigration)
  env.sqlite.exec(walkMigration)
  const walked = env.sqlite.prepare('SELECT * FROM activities ORDER BY id').all()
  assert.deepEqual(walked.map((row) => ({ ...row })), before.map((row) => targets.some(([id]) => row.id === `apple-health:${id}`)
    ? { ...row, type: 'Walk', source_type: 'Walking' } : { ...row }))
  const walkSnapshot = await createAndStoreSnapshot(env, NOW)
  for (const [id] of targets) {
    assert.equal(walkSnapshot.activities.find((item) => item.id === `apple-health:${id}`).type, 'Walk')
  }
  assert.equal(walkSnapshot.activities.find((item) => item.id.endsWith(':unrelated-training')).type, 'Workout')
})

test('a later GPX distance classifies a walking summary as a hike without replacing Health metrics', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  await insert(env, { ...BASE, type: 'Walking', distanceMeters: 0 })
  await attachRoute(env.DB, { id: `apple-health:${BASE.id}`, distanceMeters: 0, elevationGainMeters: 32 }, {
    polyline: 'hike-track', distanceMeters: 6000, elevationGainMeters: 100,
  })
  const snapshot = await createAndStoreSnapshot(env, NOW)
  assert.equal(snapshot.activities[0].type, 'Hike')
  assert.equal(snapshot.activities[0].elevationGainMeters, 32)
  assert.equal(snapshot.activities[0].activeEnergyKcal, 350)
  assert.equal(env.sqlite.prepare('SELECT type FROM activities').get().type, 'Hike')
})

test('historical category migration keeps measurements, routes, UUIDs and ambiguous training intact', { skip: !DatabaseSync }, () => {
  const sqlite = new DatabaseSync(':memory:')
  try {
    for (const file of ['0001_init.sql', '0002_workout_metrics.sql']) {
      sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'))
    }
    for (const [id, type, distance] of [['long', 'Walk', 10033], ['short', 'Hike', 4999], ['unknown', 'Workout', 969]]) {
      sqlite.prepare(`INSERT INTO activities
        (id, source, source_activity_id, type, started_at, local_date, distance_meters,
         duration_seconds, route_polyline, updated_at, active_energy_kcal, average_heart_rate_bpm)
        VALUES (?, 'apple-health', ?, ?, '2025-01-04T07:08:40Z', '2025-01-04', ?, 3600, 'track', 'before', 300, 140)
      `).run(id, id, type, distance)
    }
    const before = sqlite.prepare('SELECT * FROM activities ORDER BY id').all()
    sqlite.exec(readFileSync(new URL('../migrations/0003_activity_categories.sql', import.meta.url), 'utf8'))
    const after = sqlite.prepare('SELECT * FROM activities ORDER BY id').all()
    assert.deepEqual(after.map(({ type, source_type }) => [type, source_type]), [
      ['Hike', 'Walk'], ['Walk', 'Hike'], ['Workout', 'Workout'],
    ])
    assert.deepEqual(after.map(({ type, source_type, ...metrics }) => metrics),
      before.map(({ type, ...metrics }) => metrics))
  } finally {
    sqlite.close()
  }
})

test('explicit zeros update metrics and clear a no-longer-valid pace', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  await insert(env, BASE)
  await insert(env, {
    id: BASE.id,
    startedAt: BASE.startedAt,
    distanceMeters: 0,
    elevationGainMeters: 0,
    activeEnergyKcal: 0,
  })
  const snapshot = await createAndStoreSnapshot(env, NOW)
  assert.equal(snapshot.activities[0].distanceMeters, 0)
  assert.equal(snapshot.activities[0].elevationGainMeters, 0)
  assert.equal(snapshot.activities[0].activeEnergyKcal, 0)
  assert.equal(snapshot.activities[0].durationSeconds, 1800)
  assert.equal('pace' in snapshot.activities[0], false)
})

test('empty optional metrics do not overwrite measured values', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  await insert(env, BASE)
  await insert(env, {
    id: BASE.id,
    startedAt: BASE.startedAt,
    distanceMeters: null,
    activeEnergyKcal: null,
    averageHeartRateBpm: '',
  })
  const snapshot = await createAndStoreSnapshot(env, NOW)
  assert.equal(snapshot.activities[0].distanceMeters, 5000)
  assert.equal(snapshot.activities[0].activeEnergyKcal, 350)
  assert.equal(snapshot.activities[0].averageHeartRateBpm, 150)
})

test('publishRoute false explicitly withdraws a previously published route', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  await insert(env, BASE)
  await insert(env, { id: BASE.id, startedAt: BASE.startedAt, publishRoute: false })
  const snapshot = await createAndStoreSnapshot(env, NOW)
  assert.equal(snapshot.routes.length, 0)
  assert.equal('route' in snapshot.activities[0], false)
  assert.equal(snapshot.activities[0].averageHeartRateBpm, 150)
})

test('authenticated HealthKit summary imports are idempotent and rebuild snapshots', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  const activity = {
    id: 'stairs-id',
    type: 'Stairs',
    startedAt: '2026-10-14T06:30:00+08:00',
    durationSeconds: 900,
    activeEnergyKcal: 120,
  }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await worker.fetch(new Request('https://workouts.example/internal/healthkit', {
      method: 'POST',
      headers: { authorization: 'Bearer local-test-token', 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'apple-health', activities: [activity] }),
    }), env)
    assert.equal(response.status, 200)
    assert.equal((await response.json()).ingested, 1)
  }
  const snapshot = env.objects.get('v1/workouts.json')
  assert.equal(snapshot.activities.length, 1)
  assert.equal(snapshot.activities[0].type, 'Stairs')
  assert.equal(snapshot.activities[0].activeEnergyKcal, 120)
  assert.equal(snapshot.summary['2026'].totalActivities, 1)
  assert.equal(snapshot.summary['2026'].totalDurationSeconds, 900)
  assert.equal(snapshot.heatmap[0].date, '2026-10-14')
  assert.equal(env.objects.get('v1/routes.json').routes.length, 0)
})

test('Shortcuts can send one workout object without wrapping an activities array', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  const response = await worker.fetch(new Request('https://workouts.example/internal/healthkit', {
    method: 'POST',
    headers: { authorization: 'Bearer local-test-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'apple-health',
      id: 'single-stairs-id',
      type: 'Stairs',
      startedAt: '2026-10-14T06:30:00+08:00',
      durationSeconds: 900,
      activeEnergyKcal: 120,
    }),
  }), env)
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.ok, true)
  assert.equal(data.ingested, 1)
  assert.equal(env.objects.get('v1/workouts.json').activities[0].id, 'apple-health:single-stairs-id')
})

const GPX_TRACK = `<?xml version="1.0"?>
<gpx version="1.1" creator="WorkoutGPX"><trk><trkseg>
  <trkpt lat="39.90000" lon="116.40000"><ele>40</ele><time>2026-10-14T06:30:00Z</time></trkpt>
  <trkpt lat="39.90100" lon="116.40100"><ele>70</ele><time>2026-10-14T06:31:00Z</time></trkpt>
</trkseg></trk></gpx>`

async function ingestWorkout(env, activity) {
  return await worker.fetch(new Request('https://workouts.example/internal/healthkit', {
    method: 'POST',
    headers: { authorization: 'Bearer local-test-token', 'content-type': 'application/json' },
    body: JSON.stringify({ source: 'apple-health', ...activity }),
  }), env)
}

async function attachGpx(env, query) {
  return await worker.fetch(new Request(`https://workouts.example/internal/route${query}`, {
    method: 'POST',
    headers: { authorization: 'Bearer local-test-token', 'content-type': 'application/gpx+xml' },
    body: GPX_TRACK,
  }), env)
}

test('attaches an exported GPX track to a workout by UUID', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  await ingestWorkout(env, {
    id: 'gps-run-id',
    type: 'Run',
    startedAt: '2026-10-14T14:30:00+08:00',
    durationSeconds: 1800,
  })
  const response = await attachGpx(env, '?id=gps-run-id')
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.ok, true)
  assert.equal(data.matched, 'gps-run-id')
  assert.equal(data.points, 2)
  assert.equal(data.elevationGainMeters, 30)
  assert.ok(data.distanceMeters > 100)

  const snapshot = env.objects.get('v1/workouts.json')
  assert.equal(snapshot.activities.length, 1)
  assert.ok(snapshot.activities[0].route.length > 0)
  assert.equal(snapshot.activities[0].distanceMeters, data.distanceMeters)
  assert.equal(snapshot.activities[0].elevationGainMeters, 30)
  assert.ok(snapshot.activities[0].pace > 0)
  assert.equal(env.objects.get('v1/routes.json').routes.length, 1)
})

test('matches a GPX track by start time and keeps measured metrics', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  await ingestWorkout(env, {
    id: 'gps-ride-id',
    type: 'Ride',
    startedAt: '2026-10-14T14:30:05+08:00',
    durationSeconds: 3600,
    distanceMeters: 12000,
    elevationGainMeters: 120,
  })
  const response = await attachGpx(env, '?startedAt=2026-10-14T06:30:00Z')
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.matched, 'gps-ride-id')
  // HealthKit measurements are authoritative; GPX only fills the missing route.
  assert.equal(data.distanceMeters, 12000)
  assert.equal(data.elevationGainMeters, 120)
  const snapshot = env.objects.get('v1/workouts.json')
  assert.equal(snapshot.activities[0].distanceMeters, 12000)
  assert.equal(snapshot.activities[0].pace, 300)
})

test('reports a missing workout and rejects unusable GPX bodies', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  assert.equal((await attachGpx(env, '?id=missing')).status, 404)
  // A bare GPX with timestamps now matches on its own; with an empty database
  // there is simply nothing to attach to.
  assert.equal((await attachGpx(env, '')).status, 404)
  const noTime = await worker.fetch(new Request('https://workouts.example/internal/route', {
    method: 'POST',
    headers: { authorization: 'Bearer local-test-token', 'content-type': 'application/gpx+xml' },
    body: '<gpx><trk><trkseg><trkpt lat="1" lon="2"/><trkpt lat="1.001" lon="2.001"/></trkseg></trk></gpx>',
  }), env)
  assert.equal(noTime.status, 400)

  await ingestWorkout(env, { id: 'plain-id', type: 'Walk', startedAt: '2026-10-14T06:30:00Z', durationSeconds: 600 })
  const bad = await worker.fetch(new Request('https://workouts.example/internal/route?id=plain-id', {
    method: 'POST',
    headers: { authorization: 'Bearer local-test-token' },
    body: 'not a gpx file',
  }), env)
  assert.equal(bad.status, 400)

  const unauthenticated = await worker.fetch(new Request('https://workouts.example/internal/route?id=plain-id', {
    method: 'POST',
    body: GPX_TRACK,
  }), env)
  assert.equal(unauthenticated.status, 401)
})

test('accepts a GPX payload inside a JSON body', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  await ingestWorkout(env, { id: 'json-route-id', type: 'Run', startedAt: '2026-10-14T06:30:00Z', durationSeconds: 1800 })
  const response = await worker.fetch(new Request('https://workouts.example/internal/route', {
    method: 'POST',
    headers: { authorization: 'Bearer local-test-token', 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'json-route-id', gpx: GPX_TRACK }),
  }), env)
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.matched, 'json-route-id')
  assert.equal(data.points, 2)
  assert.equal(env.objects.get('v1/routes.json').routes.length, 1)

  const missingGpx = await worker.fetch(new Request('https://workouts.example/internal/route', {
    method: 'POST',
    headers: { authorization: 'Bearer local-test-token', 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'json-route-id' }),
  }), env)
  assert.equal(missingGpx.status, 400)
})

test('matches a bare GPX upload by the timestamp inside the file', { skip: !DatabaseSync }, async (t) => {
  const env = environment(t)
  await ingestWorkout(env, {
    id: 'auto-match-id',
    type: 'Run',
    startedAt: '2026-10-14T06:29:40Z',
    durationSeconds: 1800,
  })

  // No ?id= or ?startedAt=; the Worker reads the first track timestamp.
  const response = await attachGpx(env, '')
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.matched, 'auto-match-id')
  assert.equal(data.matchedBy, 'gpx-time')
  assert.equal(data.workoutStartedAt, '2026-10-14T06:29:40.000Z')

  // A track far outside the widened window must not attach to anything.
  const faraway = await worker.fetch(new Request('https://workouts.example/internal/route', {
    method: 'POST',
    headers: { authorization: 'Bearer local-test-token', 'content-type': 'application/gpx+xml' },
    body: GPX_TRACK.replace(/2026-10-14T06:3\d:00Z/g, '2026-10-14T09:30:00Z'),
  }), env)
  assert.equal(faraway.status, 404)
})
