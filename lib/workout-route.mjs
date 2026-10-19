import polyline from '@mapbox/polyline'
import { wgs84ToGcj02 } from './geo.mjs'

/**
 * Decode an Apple Health route (WGS-84) for a Tencent map (GCJ-02).
 * Invalid polylines are ignored so one damaged activity cannot break a map.
 */
export function decodeWorkoutRoute(route) {
  try {
    return polyline.decode(route).flatMap(([lat, lng]) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return []
      const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat)
      return [{ lat: gcjLat, lng: gcjLng }]
    })
  } catch {
    return []
  }
}
