import assert from 'node:assert/strict'
import test from 'node:test'
import { importTypeScript } from './helpers/import-typescript.mjs'

const { normalizeWorkoutsData } = await importTypeScript(new URL('../lib/workouts-schema.ts', import.meta.url))

test('preserves annual energy totals independently of the recent activity list', () => {
  const data = normalizeWorkoutsData({
    schemaVersion: 1,
    summary: {
      2026: { year: 2026, totalActivities: 60, totalActiveEnergyKcal: 615, activeEnergyActivityCount: 59 },
    },
    activities: [{ id: 'latest', startedAt: '2026-10-27T00:00:00Z', activeEnergyKcal: 10 }],
  })
  assert.equal(data.summary['2026'].totalActiveEnergyKcal, 615)
  assert.equal(data.summary['2026'].activeEnergyActivityCount, 59)
})

test('does not invent annual energy totals for older or invalid snapshots', () => {
  for (const value of [undefined, null, -1, '615', Infinity]) {
    const data = normalizeWorkoutsData({
      schemaVersion: 1,
      summary: { 2026: { year: 2026, totalActivities: 60, totalActiveEnergyKcal: value } },
      activities: [{ id: 'latest', startedAt: '2026-10-27T00:00:00Z', activeEnergyKcal: 10 }],
    })
    assert.equal(data.summary['2026'].totalActiveEnergyKcal, undefined)
  }
})

test('distinguishes measured zero calories from missing calories', () => {
  const data = normalizeWorkoutsData({
    schemaVersion: 1,
    summary: { 2026: { year: 2026, totalActiveEnergyKcal: 0, activeEnergyActivityCount: 1 } },
    activities: [
      { id: 'zero', startedAt: '2026-10-27T00:00:00Z', activeEnergyKcal: 0 },
      { id: 'missing', startedAt: '2026-10-26T00:00:00Z', activeEnergyKcal: null },
    ],
  })
  assert.equal(data.summary['2026'].totalActiveEnergyKcal, 0)
  assert.equal(data.activities[0].activeEnergyKcal, 0)
  assert.equal(data.activities[1].activeEnergyKcal, undefined)
})

test('normalizes stair flights and steps without treating them as elevation meters', () => {
  const data = normalizeWorkoutsData({
    schemaVersion: 1,
    activities: [
      { id: 'flights', type: 'Stairs', startedAt: '2026-10-27T00:00:00Z', flightsClimbed: 36 },
      { id: 'steps', type: 'Stairs', startedAt: '2026-10-26T00:00:00Z', stepsClimbed: 540 },
      { id: 'bad', type: 'Stairs', startedAt: '2026-10-25T00:00:00Z', flightsClimbed: -1 },
      { id: 'zero', type: 'Stairs', startedAt: '2026-10-24T00:00:00Z', flightsClimbed: 0 },
    ],
  })
  assert.equal(data.activities[0].flightsClimbed, 36)
  assert.equal(data.activities[0].elevationGainMeters, 0)
  assert.equal(data.activities[1].stepsClimbed, 540)
  assert.equal(data.activities[2].flightsClimbed, undefined)
  assert.equal(data.activities[3].flightsClimbed, undefined)
})
