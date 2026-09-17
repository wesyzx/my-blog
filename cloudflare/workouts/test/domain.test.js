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

test('rejects an activity without an id or valid date', () => {
  assert.throws(() => normalizeActivity({ startedAt: NOW }, 'test', NOW), /id is required/)
  assert.throws(() => normalizeActivity({ id: 'x', startedAt: 'not-a-date' }, 'test', NOW), /invalid startedAt/)
})
