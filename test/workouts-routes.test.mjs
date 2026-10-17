import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeRoutesData } from '../lib/workouts-schema.ts'

test('normalizes the complete route snapshot independently from recent activities', () => {
  const routes = normalizeRoutesData({
    schemaVersion: 1,
    lastUpdated: '2026-10-17T12:17:15.852Z',
    routes: [
      {
        id: 'apple-health:new',
        type: 'Walk',
        startedAt: '2026-10-15T11:20:49.000Z',
        distanceMeters: 3038.88,
        durationSeconds: 1946.23,
        route: 'encoded-new',
      },
      {
        id: 'apple-health:old',
        type: 'Run',
        startedAt: '2024-11-10T06:46:43.349Z',
        distanceMeters: 1071.25,
        durationSeconds: 1165.93,
        route: 'encoded-old',
      },
    ],
  })

  assert.ok(routes)
  assert.equal(routes.routes.length, 2)
  assert.equal(routes.routes[0].id, 'apple-health:new')
  assert.equal(routes.routes[0].route, 'encoded-new')
  assert.equal(routes.routes[1].type, 'Run')
})

test('drops malformed route records without discarding valid routes', () => {
  const routes = normalizeRoutesData({
    schemaVersion: 1,
    routes: [
      { id: 'missing-route', startedAt: '2026-01-01T00:00:00Z' },
      { id: 'missing-date', route: 'encoded' },
      { id: 'invalid-date', startedAt: 'not-a-date', route: 'encoded' },
      { id: 42, type: 'running', startedAt: '2026-01-02T00:00:00Z', route: 'encoded' },
    ],
  })

  assert.ok(routes)
  assert.equal(routes.routes.length, 1)
  assert.equal(routes.routes[0].id, '42')
  assert.equal(routes.routes[0].type, 'Workout')
})

test('rejects route snapshots with an incompatible schema version', () => {
  assert.equal(normalizeRoutesData({ schemaVersion: 2, routes: [] }), null)
})
