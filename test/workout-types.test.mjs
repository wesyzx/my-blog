import assert from 'node:assert/strict'
import test from 'node:test'
import { latestHikingRoute, normalizeWorkoutType, WORKOUT_LABELS } from '../lib/workout-types.mjs'
import { importTypeScript } from './helpers/import-typescript.mjs'

const { normalizeWorkoutsData } = await importTypeScript(new URL('../lib/workouts-schema.ts', import.meta.url))

test('Apple names, Actions names and Chinese names use the requested display categories', () => {
  for (const [type, label] of [
    ['HKWorkoutActivityTypeCooldown', '拉伸'], ['Cooldown', '拉伸'], ['整理放松', '拉伸'],
    ['Outdoor Walking', '步行'], ['HKWorkoutActivityTypeWalking', '步行'],
    ['Stair Climbing', '爬楼'], ['爬楼梯', '爬楼'],
    ['HKWorkoutActivityTypeJumpRope', '跳绳'], ['Jump Rope', '跳绳'], ['跳绳', '跳绳'],
    ['Outdoor Running', '跑步'], ['HKWorkoutActivityTypeRunning', '跑步'],
    ['Outdoor Cycling', '骑行'], ['户外单车', '骑行'],
    ['HKWorkoutActivityTypeHighIntensityIntervalTraining', '训练'],
    ['Functional Strength Training', '训练'], ['Core Training', '训练'],
    ['高强度间歇训练', '训练'], ['功能性力量训练', '训练'], ['核心训练', '训练'],
  ]) assert.equal(WORKOUT_LABELS[normalizeWorkoutType(type)], label, type)
})

test('the 5 km boundary applies only to walking/hiking and preserves all other sports', () => {
  for (const type of ['Walk', 'Hike', '徒步', 'HKWorkoutActivityTypeWalking']) {
    assert.equal(normalizeWorkoutType(type, 4999.99), 'Walk')
    assert.equal(normalizeWorkoutType(type, 5000), 'Hike')
    assert.equal(normalizeWorkoutType(type, 10033), 'Hike')
  }
  assert.equal(normalizeWorkoutType('Run', 10000), 'Run')
  assert.equal(normalizeWorkoutType('Ride', 10000), 'Ride')
})

test('historical public snapshots gain the same categories in server and browser normalization', () => {
  const snapshot = normalizeWorkoutsData({
    schemaVersion: 1,
    activities: [
      { id: 'old-walk', type: 'Walk', startedAt: '2025-01-04T07:08:40Z', distanceMeters: 10033 },
      { id: 'stretch', type: 'Cooldown', startedAt: '2026-10-22T06:00:00Z' },
      { id: 'rope', type: 'JumpRope', startedAt: '2026-10-21T06:00:00Z' },
      { id: 'unknown', type: 'Workout', startedAt: '2026-03-24T08:33:53Z' },
    ],
  })
  assert.deepEqual(snapshot.activities.map(({ id, type }) => [id, type]), [
    ['stretch', 'Stretch'], ['rope', 'JumpRope'], ['unknown', 'Workout'], ['old-walk', 'Hike'],
  ])
})

test('latest route skips short walks, runs and rides and finds an older hike', () => {
  const routes = [
    { id: 'walk', type: 'Walk', distanceMeters: 3039, route: 'a', startedAt: '2026-10-15' },
    { id: 'run', type: 'Run', distanceMeters: 10000, route: 'b', startedAt: '2026-10-16' },
    { id: 'ride', type: 'Ride', distanceMeters: 20000, route: 'c', startedAt: '2026-10-17' },
    { id: 'new-hike-no-gps', type: 'Hike', distanceMeters: 8000, startedAt: '2026-10-18' },
    { id: 'old-long-walk', type: 'Walk', distanceMeters: 10033, route: 'd', startedAt: '2025-01-04' },
    { id: 'older-hike', type: 'Hike', distanceMeters: 5000, route: 'e', startedAt: '2024-01-01' },
  ]
  assert.equal(latestHikingRoute(routes).id, 'old-long-walk')
  assert.equal(latestHikingRoute(routes.slice(0, 4)), null)
  assert.equal(latestHikingRoute([]), null)
})
