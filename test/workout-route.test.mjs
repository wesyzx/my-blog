import assert from 'node:assert/strict'
import test from 'node:test'
import polyline from '@mapbox/polyline'
import { decodeWorkoutRoute } from '../lib/workout-route.mjs'

test('decodes workout routes into finite GCJ-02 map points', () => {
  const route = polyline.encode([[29.8683, 121.544], [29.869, 121.545]])
  const points = decodeWorkoutRoute(route)
  assert.equal(points.length, 2)
  assert.ok(points.every(({ lat, lng }) => Number.isFinite(lat) && Number.isFinite(lng)))
  assert.notDeepEqual(points[0], { lat: 29.8683, lng: 121.544 })
})

test('malformed workout routes are ignored without breaking the map', () => {
  assert.deepEqual(decodeWorkoutRoute('garbage'), [])
  assert.deepEqual(decodeWorkoutRoute(undefined), [])
})
