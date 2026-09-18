'use client'

import { useEffect, useRef, useState } from 'react'
import polyline from '@mapbox/polyline'
import { wgs84ToGcj02 } from '@/lib/geo'
import { boundsOf, loadTMap, TMAP_KEY_MISSING, type TMapLatLng, type TMapMap } from '@/lib/tmap'

/** 起终点圆点，白描边保证在任何底图上都看得清 */
function endpointDot(fill: string) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">'
    + `<circle cx="9" cy="9" r="7" fill="${fill}" stroke="#ffffff" stroke-width="2.5"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export default function WorkoutMap({ route, className = '' }: { route?: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (!container || !route || TMAP_KEY_MISSING) return

    let disposed = false
    let map: TMapMap | null = null

    // 轨迹来自 Apple Health，是 WGS-84；腾讯底图用 GCJ-02，逐点转换后才会贴合道路
    const path: TMapLatLng[] = polyline
      .decode(route)
      .map(([lat, lng]) => {
        const [gcjLng, gcjLat] = wgs84ToGcj02(lng, lat)
        return { lat: gcjLat, lng: gcjLng }
      })

    if (path.length === 0) return

    loadTMap()
      .then((TMap) => {
        if (disposed) return

        map = new TMap.Map(container, {
          center: new TMap.LatLng(path[0].lat, path[0].lng),
          zoom: 14,
          pitch: 0,
          rotation: 0,
          viewMode: '2D',
        })
        if (disposed) return

        new TMap.MultiPolyline({
          id: 'workout-route',
          map,
          styles: {
            route: new TMap.PolylineStyle({
              color: '#52704b',
              width: 4,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,.85)',
              lineCap: 'round',
            }),
          },
          geometries: [
            {
              id: 'route',
              styleId: 'route',
              path: path.map((point) => new TMap.LatLng(point.lat, point.lng)),
            },
          ],
        })

        const start = path[0]
        const end = path[path.length - 1]

        new TMap.MultiMarker({
          id: 'workout-endpoints',
          map,
          styles: {
            start: new TMap.MarkerStyle({ width: 18, height: 18, anchor: { x: 9, y: 9 }, src: endpointDot('#52704b') }),
            end: new TMap.MarkerStyle({ width: 18, height: 18, anchor: { x: 9, y: 9 }, src: endpointDot('#a96545') }),
          },
          geometries: [
            { id: 'start', styleId: 'start', position: new TMap.LatLng(start.lat, start.lng) },
            { id: 'end', styleId: 'end', position: new TMap.LatLng(end.lat, end.lng) },
          ],
        })

        new TMap.MultiLabel({
          id: 'workout-endpoint-labels',
          map,
          styles: {
            tag: new TMap.LabelStyle({
              color: '#242621',
              size: 12,
              offset: { x: 13, y: 0 },
              angle: 0,
              alignment: 'left',
              verticalAlignment: 'middle',
            }),
          },
          geometries: [
            { id: 'start-label', styleId: 'tag', position: new TMap.LatLng(start.lat, start.lng), content: '起' },
            { id: 'end-label', styleId: 'tag', position: new TMap.LatLng(end.lat, end.lng), content: '终' },
          ],
        })

        const { southWest, northEast } = boundsOf(path)
        map.fitBounds(
          new TMap.LatLngBounds(
            new TMap.LatLng(southWest.lat, southWest.lng),
            new TMap.LatLng(northEast.lat, northEast.lng),
          ),
          { padding: 40, maxZoom: 15 },
        )
      })
      .catch((reason: Error) => {
        if (!disposed) setError(reason.message)
      })

    return () => {
      disposed = true
      map?.destroy()
      map = null
    }
  }, [route])

  if (!route) return null

  return (
    <div className={`workout-map-shell ${className}`}>
      {TMAP_KEY_MISSING ? (
        <div className="map-key-notice"><p>轨迹地图需要配置 <code>NEXT_PUBLIC_TMAP_KEY</code>。</p></div>
      ) : error ? (
        <div className="map-key-notice"><p>{error}</p></div>
      ) : (
        <div ref={containerRef} />
      )}
    </div>
  )
}
