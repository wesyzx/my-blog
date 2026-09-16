'use client'

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import polyline from '@mapbox/polyline'

const LIGHT_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors'
    }
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

export default function WorkoutMap({ route, className = '' }: { route?: string, className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || !route || mapRef.current) return

    try {
      // Decode polyline (returns array of [lat, lng])
      const coordinates = polyline.decode(route)
      if (coordinates.length === 0) return

      // Convert to [lng, lat] for GeoJSON
      const geojsonCoords = coordinates.map(c => [c[1], c[0]])

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: LIGHT_STYLE,
        center: geojsonCoords[0] as [number, number],
        zoom: 13,
        attributionControl: false
      })
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

      map.on('load', () => {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: geojsonCoords
            }
          }
        })

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#52704b',
            'line-width': 4,
            'line-opacity': 0.8
          }
        })

        // Fit bounds
        const bounds = new maplibregl.LngLatBounds()
        geojsonCoords.forEach(coord => bounds.extend(coord as [number, number]))
        map.fitBounds(bounds, { padding: 40, maxZoom: 15 })
      })

      mapRef.current = map
    } catch (e) {
      console.error('Failed to render route map:', e)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [route])

  if (!route) return null

  return (
    <div className={`workout-map-shell ${className}`}>
      <div ref={containerRef} />
    </div>
  )
}
