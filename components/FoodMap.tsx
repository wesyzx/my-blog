'use client'

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FoodMeta } from '@/lib/food'

const LIGHT_STYLE: StyleSpecification = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; OpenStreetMap contributors' } },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

export default function FoodMap({ posts }: { posts: FoodMeta[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const validPosts = posts.filter((post) => post.lng && post.lat)
    const map = new maplibregl.Map({ container: containerRef.current, style: LIGHT_STYLE, center: [121.55, 29.87], zoom: 13, attributionControl: false })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')

    map.on('load', () => {
      validPosts.forEach((post) => {
        const markerElement = document.createElement('button')
        markerElement.type = 'button'
        markerElement.className = 'food-marker'
        markerElement.setAttribute('aria-label', `查看 ${post.location}`)
        const pin = document.createElement('span')
        pin.className = 'food-marker-pin'
        const label = document.createElement('span')
        label.className = 'food-marker-label'
        label.textContent = post.location
        markerElement.append(pin, label)

        const marker = new maplibregl.Marker({ element: markerElement, anchor: 'center' }).setLngLat([post.lng, post.lat]).addTo(map)
        markerElement.addEventListener('click', () => {
          const content = document.createElement('div')
          content.className = 'food-popup-content'
          const title = document.createElement('h4')
          title.textContent = post.title
          const address = document.createElement('p')
          address.textContent = post.address || post.location
          const excerpt = document.createElement('p')
          excerpt.textContent = post.excerpt
          const link = document.createElement('a')
          link.href = `/food/${encodeURIComponent(post.slug)}`
          link.textContent = '查看详情 →'
          content.append(title, address)
          if (post.excerpt) content.append(excerpt)
          content.append(link)
          marker.setPopup(new maplibregl.Popup({ offset: [0, -14], closeButton: false, className: 'food-map-popup' }).setDOMContent(content))
          marker.togglePopup()
        })
      })

      if (validPosts.length === 1) map.jumpTo({ center: [validPosts[0].lng, validPosts[0].lat], zoom: 15 })
      if (validPosts.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        validPosts.forEach((post) => bounds.extend([post.lng, post.lat]))
        map.fitBounds(bounds, { padding: 80, maxZoom: 15 })
      }
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [posts])

  return <div ref={containerRef} className="food-map" />
}
