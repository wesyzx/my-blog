import assert from 'node:assert/strict'
import test from 'node:test'
import { gcj02ToWgs84, wgs84ToGcj02 } from '../lib/geo.mjs'

test('converts a known mainland GPS point to the map coordinate system', () => {
  const [lng, lat] = wgs84ToGcj02(116.404, 39.915)
  assert.ok(Math.abs(lng - 116.41024449916938) < 1e-9)
  assert.ok(Math.abs(lat - 39.91640428150164) < 1e-9)
})

test('reverse conversion used by the content builder approximately recovers GPS coordinates', () => {
  const [lng, lat] = gcj02ToWgs84(...wgs84ToGcj02(121.55, 29.87))
  assert.ok(Math.abs(lng - 121.55) < 0.00002)
  assert.ok(Math.abs(lat - 29.87) < 0.00002)
})

test('coordinates outside the conversion region stay unchanged', () => {
  for (const point of [[-73.9857, 40.7484], [151.2093, -33.8688]]) {
    assert.deepEqual(wgs84ToGcj02(...point), point)
    assert.deepEqual(gcj02ToWgs84(...point), point)
  }
})
