import assert from 'node:assert/strict'
import test from 'node:test'
import polyline from '@mapbox/polyline'
import { distanceMeters, elevationGainMeters, encodePolyline, parseGpx, summarizeGpx } from '../src/gpx.js'

const GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WorkoutGPX" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Morning Run</name>
    <trkseg>
      <trkpt lat="39.90000" lon="116.40000"><ele>40</ele><time>2026-10-14T07:00:00Z</time></trkpt>
      <trkpt lat="39.90100" lon="116.40100"><ele>52</ele><time>2026-10-14T07:01:00Z</time></trkpt>
      <trkpt lat="39.90200" lon="116.40200"><ele>44</ele><time>2026-10-14T07:02:00Z</time></trkpt>
      <trkpt lat="39.90300" lon="116.40300"><ele>70</ele><time>2026-10-14T07:03:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`

test('parses track points and ignores malformed coordinates', () => {
  const points = parseGpx(GPX)
  assert.equal(points.length, 4)
  assert.deepEqual({ lat: points[0].lat, lng: points[0].lng }, { lat: 39.9, lng: 116.4 })
  assert.equal(points[0].elevation, 40)
  assert.equal(points[0].time, '2026-10-14T07:00:00.000Z')

  const withNoise = parseGpx(GPX.replace('lat="39.90200"', 'lat="not-a-number"'))
  assert.equal(withNoise.length, 3)
})

test('rejects payloads that are not a usable GPX track', () => {
  assert.throws(() => parseGpx(''), /empty/)
  assert.throws(() => parseGpx('{"activities":[]}'), /not a GPX file/)
  assert.throws(() => parseGpx('<gpx><trk><trkseg><trkpt lat="1" lon="2"/></trkseg></trk></gpx>'), /usable track/)
})

test('encoded polyline round-trips through the frontend decoder', () => {
  const points = parseGpx(GPX)
  const decoded = polyline.decode(encodePolyline(points))
  assert.equal(decoded.length, points.length)
  for (const [index, [lat, lng]] of decoded.entries()) {
    assert.ok(Math.abs(lat - points[index].lat) < 1e-5)
    assert.ok(Math.abs(lng - points[index].lng) < 1e-5)
  }
})

test('measures track length and ignores small elevation noise', () => {
  const points = parseGpx(GPX)
  const distance = distanceMeters(points)
  // Three ~140 m legs across a 0.001 degree grid.
  assert.ok(distance > 400 && distance < 500, `unexpected distance ${distance}`)

  const noisy = [{ elevation: 40 }, { elevation: 40.5 }, { elevation: 41 }, { elevation: 50 }, { elevation: 49 }]
  assert.equal(elevationGainMeters(noisy, 2), 10)
})

test('summarizes a GPX export with route, distance and start time', () => {
  const summary = summarizeGpx(GPX)
  assert.equal(summary.points.length, 4)
  assert.ok(summary.polyline.length > 0)
  assert.equal(summary.startedAt, '2026-10-14T07:00:00.000Z')
  assert.ok(summary.distanceMeters > 0)
  // 40→52 (+12), 52→44 is a descent, 44→70 (+26)
  assert.equal(summary.elevationGainMeters, 38)
})
