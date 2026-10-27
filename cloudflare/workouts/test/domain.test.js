import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRoutesSnapshot, buildSnapshot, normalizeActivity } from '../src/domain.js'

const NOW = new Date('2026-09-16T08:00:00.000Z')

test('normalizes metrics, type aliases and calculates pace', () => {
  const activity = normalizeActivity({
    id: 42,
    type: 'running',
    startedAt: '2026-09-15T23:30:00+08:00',
    localDate: '2026-09-15',
    distance: 5000,
    duration: 1500,
    elevationGain: 32,
  }, 'strava', NOW)

  assert.equal(activity.id, 'strava:42')
  assert.equal(activity.type, 'Run')
  assert.equal(activity.localDate, '2026-09-15')
  assert.equal(activity.pace, 300)
})

test('preserves stair climbing as a distinct activity type', () => {
  const activity = normalizeActivity({
    id: 'stairs-1',
    type: 'stairs',
    startedAt: NOW,
    durationSeconds: 900,
  }, 'apple-health', NOW)

  assert.equal(activity.type, 'Stairs')
})

test('does not publish a route unless explicitly allowed', () => {
  const hidden = normalizeActivity({ id: 'a', startedAt: NOW, route: 'encoded-route' }, 'manual', NOW)
  const visible = normalizeActivity({ id: 'b', startedAt: NOW, route: 'encoded-route', publishRoute: true }, 'manual', NOW)
  assert.equal(hidden.route, undefined)
  assert.equal(visible.route, 'encoded-route')
  assert.throws(() => normalizeActivity({ id: 'c', startedAt: NOW, route: '  ', publishRoute: true }, 'manual', NOW), /invalid route/)
})

test('builds a complete route snapshot independently from the recent activity list', () => {
  const activities = [
    normalizeActivity({ id: 'old', type: 'run', startedAt: '2024-01-01T08:00:00Z', route: 'old-route', publishRoute: true }, 'apple-health', NOW),
    normalizeActivity({ id: 'hidden', type: 'run', startedAt: '2025-01-01T08:00:00Z', route: 'private-route' }, 'apple-health', NOW),
  ]
  const snapshot = buildRoutesSnapshot(activities, NOW)
  assert.equal(snapshot.routes.length, 1)
  assert.equal(snapshot.routes[0].id, 'apple-health:old')
  assert.equal(snapshot.routes[0].route, 'old-route')
})

test('builds the frontend schema with yearly and daily aggregates', () => {
  const activities = [
    normalizeActivity({ id: '1', type: 'run', startedAt: '2026-09-15T08:00:00Z', distanceMeters: 5000, durationSeconds: 1500 }, 'test', NOW),
    normalizeActivity({ id: '2', type: 'ride', startedAt: '2026-09-15T10:00:00Z', distanceMeters: 20000, durationSeconds: 3600 }, 'test', NOW),
    normalizeActivity({ id: '3', type: 'walk', startedAt: '2025-12-31T10:00:00Z', distanceMeters: 2000, durationSeconds: 1800 }, 'test', NOW),
  ]
  const snapshot = buildSnapshot(activities, NOW)

  assert.equal(snapshot.schemaVersion, 1)
  assert.equal(snapshot.summary['2026'].totalActivities, 2)
  assert.equal(snapshot.summary['2026'].totalDistanceMeters, 25000)
  assert.deepEqual(snapshot.heatmap.find((item) => item.date === '2026-09-15'), {
    date: '2026-09-15',
    activityCount: 2,
    distanceMeters: 25000,
  })
  assert.equal(snapshot.activities[0].id, 'test:2')
})

test('aggregates measured active energy across the full year before limiting recent activities', () => {
  const activities = Array.from({ length: 60 }, (_, index) => normalizeActivity({
    id: `energy-${index}`,
    startedAt: '2026-01-01T00:30:00+08:00',
    activeEnergyKcal: 10.25,
  }, 'test', NOW))
  activities.push(
    normalizeActivity({ id: 'missing', startedAt: '2026-06-01T00:00:00Z' }, 'test', NOW),
    normalizeActivity({ id: 'zero', startedAt: '2026-06-02T00:00:00Z', activeEnergyKcal: 0 }, 'test', NOW),
    normalizeActivity({ id: 'old', startedAt: '2025-06-01T00:00:00Z', activeEnergyKcal: 100 }, 'test', NOW),
  )
  const snapshot = buildSnapshot(activities, NOW)
  assert.equal(snapshot.activities.length, 50)
  assert.equal(snapshot.summary['2026'].totalActiveEnergyKcal, 615)
  assert.equal(snapshot.summary['2026'].activeEnergyActivityCount, 61)
  assert.equal(snapshot.summary['2026'].totalActivities, 62)
  assert.equal(snapshot.summary['2025'].totalActiveEnergyKcal, 100)
})

test('preserves measured stair elevation in the yearly total and the public workout', () => {
  const measured = normalizeActivity({
    id: 'stairs-elevation', type: 'Stairs', startedAt: NOW, elevationGainMeters: 128.5,
  }, 'test', NOW)
  const unmeasured = normalizeActivity({
    id: 'stairs-missing', type: 'Stairs', startedAt: NOW,
  }, 'test', NOW)
  const snapshot = buildSnapshot([measured, unmeasured], NOW)
  assert.equal(snapshot.summary['2026'].totalElevationGainMeters, 128.5)
  assert.equal(snapshot.activities[0].elevationGainMeters, 128.5)
  assert.equal(snapshot.summary['2026'].activeEnergyActivityCount, 0)
})

test('publishes stairs and flights separately from elevation meters', () => {
  const activity = normalizeActivity({
    id: 'stairs-flights', type: 'Stairs', startedAt: NOW, flightsClimbed: 36, stepsClimbed: 540,
  }, 'test', NOW)
  const snapshot = buildSnapshot([activity], NOW)
  assert.equal(activity.elevationGainMeters, 0)
  assert.equal(snapshot.activities[0].flightsClimbed, 36)
  assert.equal(snapshot.activities[0].stepsClimbed, 540)
})

test('rejects an activity without an id or valid date', () => {
  assert.throws(() => normalizeActivity({ startedAt: NOW }, 'test', NOW), /id is required/)
  assert.throws(() => normalizeActivity({ id: 'x', startedAt: 'not-a-date' }, 'test', NOW), /invalid startedAt/)
})

test('rejects unit-bearing or invalid numeric metrics instead of silently writing zero', () => {
  assert.throws(() => normalizeActivity({ id: 'x', startedAt: NOW, durationSeconds: '900 秒' }), /without units/)
  assert.throws(() => normalizeActivity({ id: 'x', startedAt: NOW, activeEnergyKcal: -1 }), /non-negative/)
})

test('omits unmeasured optional metrics instead of publishing null', () => {
  // D1 returns NULL for every unmeasured column; publishing those as `null`
  // made the workouts page render a missing heart rate as "0 bpm".
  const activity = normalizeActivity({
    id: 'stairs-without-heart-rate',
    type: 'Stairs',
    startedAt: NOW,
    durationSeconds: 900,
    activeEnergyKcal: 120,
    averageHeartRateBpm: null,
    maxHeartRateBpm: null,
    averageCadenceRpm: null,
    distanceMeters: 0,
  })
  const snapshot = buildSnapshot([activity], NOW)
  const [published] = snapshot.activities
  assert.equal(published.activeEnergyKcal, 120)
  assert.equal('averageHeartRateBpm' in published, false)
  assert.equal('maxHeartRateBpm' in published, false)
  assert.equal('averageCadenceRpm' in published, false)
  assert.equal('pace' in published, false)
  assert.equal('route' in published, false)
})

test('treats a zero heart rate from Shortcuts statistics as unmeasured', () => {
  // Calculate Statistics returns 0 when Find Health Samples matched no
  // heart-rate samples inside the workout window. 0 bpm is not a measurement.
  const activity = normalizeActivity({
    id: 'stairs-with-empty-heart-rate-window',
    type: 'Stairs',
    startedAt: NOW,
    durationSeconds: 900,
    averageHeartRateBpm: 0,
    maxHeartRateBpm: '0',
  })
  const snapshot = buildSnapshot([activity], NOW)
  const [published] = snapshot.activities
  assert.equal('averageHeartRateBpm' in published, false)
  assert.equal('maxHeartRateBpm' in published, false)
})
