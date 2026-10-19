// Minimal GPX reader for WorkoutGPX / Apple Health exports.
// The blog stores routes as Google encoded polylines, so the file is reduced
// to coordinates (plus elevation for the climb total) before it is persisted.

const EARTH_RADIUS_METERS = 6_371_008.8

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))
  return match ? match[2] : null
}

function textOf(block, name) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([^<]*)</${name}>`, 'i'))
  return match ? match[1].trim() : null
}

function optionalNumber(value) {
  if (value === null || !value.trim()) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

/** Extract every track point, skipping route points and malformed entries. */
export function parseGpx(xml) {
  if (typeof xml !== 'string' || !xml.trim()) throw new Error('GPX payload is empty')
  if (!/<gpx[\s>]/i.test(xml)) throw new Error('Payload is not a GPX file')

  const points = []
  const segments = xml.match(/<trkseg[\s\S]*?<\/trkseg>/gi)
    ?? xml.match(/<rte[\s\S]*?<\/rte>/gi)
    ?? []

  for (const segment of segments) {
    const trackPoints = segment.match(/<(?:trkpt|rtept)\b[^>]*\/>|<(?:trkpt|rtept)\b[^>]*>[\s\S]*?<\/(?:trkpt|rtept)>/gi) ?? []
    for (const trackPoint of trackPoints) {
      const openTag = trackPoint.match(/^<(?:trkpt|rtept)\b[^>]*>/i)?.[0] ?? ''
      const lat = optionalNumber(attribute(openTag, 'lat'))
      const lng = optionalNumber(attribute(openTag, 'lon'))
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue

      const elevation = optionalNumber(textOf(trackPoint, 'ele'))
      const time = textOf(trackPoint, 'time')
      points.push({
        lat,
        lng,
        elevation: Number.isFinite(elevation) ? elevation : undefined,
        time: time && !Number.isNaN(new Date(time).getTime()) ? new Date(time).toISOString() : undefined,
      })
    }
  }

  if (points.length < 2) throw new Error('GPX file does not contain a usable track')
  return points
}

/** Google encoded polyline at 1e-5 precision, matching @mapbox/polyline. */
export function encodePolyline(points) {
  let output = ''
  let previousLatitude = 0
  let previousLongitude = 0

  const encodeValue = (value) => {
    let remaining = value < 0 ? ~(value << 1) : value << 1
    let chunk = ''
    while (remaining >= 0x20) {
      chunk += String.fromCharCode((0x20 | (remaining & 0x1f)) + 63)
      remaining >>= 5
    }
    return chunk + String.fromCharCode(remaining + 63)
  }

  for (const point of points) {
    const latitude = Math.round(point.lat * 1e5)
    const longitude = Math.round(point.lng * 1e5)
    output += encodeValue(latitude - previousLatitude)
    output += encodeValue(longitude - previousLongitude)
    previousLatitude = latitude
    previousLongitude = longitude
  }
  return output
}

export function distanceMeters(points) {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]
    const to = points[index]
    const deltaLatitude = toRadians(to.lat - from.lat)
    const deltaLongitude = toRadians(to.lng - from.lng)
    const a = Math.sin(deltaLatitude / 2) ** 2
      + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLongitude / 2) ** 2
    total += 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)))
  }
  return total
}

/** Sum only the upward parts, ignoring GPS noise below the threshold. */
export function elevationGainMeters(points, threshold = 2) {
  let gain = 0
  let reference
  for (const point of points) {
    if (point.elevation === undefined) continue
    if (reference === undefined) {
      reference = point.elevation
      continue
    }
    const delta = point.elevation - reference
    if (delta >= threshold) {
      gain += delta
      reference = point.elevation
    } else if (delta <= -threshold) {
      reference = point.elevation
    }
  }
  return gain
}

export function summarizeGpx(xml) {
  const points = parseGpx(xml)
  return {
    points,
    polyline: encodePolyline(points),
    distanceMeters: distanceMeters(points),
    elevationGainMeters: elevationGainMeters(points),
    startedAt: points.find((point) => point.time)?.time ?? null,
  }
}
