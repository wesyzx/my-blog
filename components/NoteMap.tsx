'use client'

import { useEffect, useRef, useState } from 'react'
import { wgs84ToGcj02 } from '@/lib/geo.mjs'
import { loadTMap, mapOptions, TMAP_KEY_MISSING, type TMapLatLng, type TMapMap } from '@/lib/tmap'

const PIN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">'
  + '<path d="M13 33.2C13 33.2 24.6 19.6 24.6 12.6A11.6 11.6 0 1 0 1.4 12.6C1.4 19.6 13 33.2 13 33.2Z" fill="#242621" stroke="#ffffff" stroke-width="2.4"/>'
  + '<circle cx="13" cy="12.6" r="4" fill="#ffffff"/></svg>'
const PIN_SRC = `data:image/svg+xml,${encodeURIComponent(PIN_SVG)}`

export default function NoteMap({ latitude, longitude, label = '短记地点' }: {
  latitude: number
  longitude: number
  label?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (!container || TMAP_KEY_MISSING) return

    let disposed = false
    let map: TMapMap | null = null
    // Memos 保存的是 GPS 坐标（WGS-84），腾讯地图底图使用 GCJ-02。
    const [lng, lat] = wgs84ToGcj02(longitude, latitude)
    const position: TMapLatLng = { lat, lng }

    loadTMap()
      .then((TMap) => {
        if (disposed) return
        map = new TMap.Map(container, mapOptions(new TMap.LatLng(position.lat, position.lng), 15))
        if (disposed) return

        new TMap.MultiMarker({
          id: 'note-marker',
          map,
          styles: {
            spot: new TMap.MarkerStyle({ width: 26, height: 34, anchor: { x: 13, y: 34 }, src: PIN_SRC }),
          },
          geometries: [{
            id: 'note',
            styleId: 'spot',
            position: new TMap.LatLng(position.lat, position.lng),
          }],
        })

        if (label) {
          new TMap.MultiLabel({
            id: 'note-label',
            map,
            styles: {
              tag: new TMap.LabelStyle({
                color: '#ffffff',
                backgroundColor: '#242621',
                size: 12,
                offset: { x: 18, y: -17 },
                angle: 0,
                alignment: 'left',
                verticalAlignment: 'middle',
                padding: '4px 7px',
              }),
            },
            geometries: [{
              id: 'note-label',
              styleId: 'tag',
              position: new TMap.LatLng(position.lat, position.lng),
              content: label,
            }],
          })
        }
      })
      .catch((reason: Error) => {
        if (!disposed) setError(reason.message)
      })

    return () => {
      disposed = true
      map?.destroy()
      map = null
    }
  }, [label, latitude, longitude])

  if (TMAP_KEY_MISSING) return null
  if (error) return <div className="map-key-notice"><p>{error}</p></div>
  return <div ref={containerRef} className="note-map" aria-label={label || '短记地点地图'} />
}
