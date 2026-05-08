'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FoodMeta } from '@/lib/food'

// 浅色地图样式，匹配博客淡蓝灰主题
const LIGHT_STYLE = {
  version: 8,
  name: 'Light',
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
}

interface FoodMapProps {
  posts: FoodMeta[]
}

export default function FoodMap({ posts }: FoodMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const validPosts = posts.filter((p) => p.lng && p.lat)

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: LIGHT_STYLE as any,
      center: [121.4737, 31.2304],
      zoom: 13,
      attributionControl: false,
    })

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right'
    )

    map.on('load', () => {
      validPosts.forEach((post) => {
        const el = document.createElement('div')
        el.innerHTML = `
          <div style="
            display:flex;
            flex-direction:column;
            align-items:center;
            cursor:pointer;
            transform:translate(-50%,-100%);
          ">
            <div style="
              width:12px;height:12px;
              border-radius:50%;
              background:#98c1d9;
              box-shadow:0 0 0 5px rgba(152,193,217,0.18), 0 0 0 11px rgba(152,193,217,0.07);
            "></div>
            <div style="
              margin-top:8px;
              padding:4px 12px;
              border-radius:999px;
              background:rgba(255,255,255,0.85);
              backdrop-filter:blur(8px);
              -webkit-backdrop-filter:blur(8px);
              color:#475671;
              font-size:12px;
              font-weight:500;
              letter-spacing:0.02em;
              white-space:nowrap;
              box-shadow:0 1px 6px rgba(41,50,65,0.08);
            ">${post.location}</div>
          </div>
        `

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([post.lng, post.lat])
          .addTo(map)

        el.addEventListener('click', () => {
          const popup = new maplibregl.Popup({
            offset: [0, -16],
            closeButton: false,
            className: 'food-map-popup',
          }).setHTML(`
            <div style="padding:4px;min-width:200px">
              <h4 style="margin:0 0 6px;font-size:15px;color:#293241;font-family:Georgia,'Noto Serif SC',serif;font-weight:700">${post.title}</h4>
              <p style="margin:0 0 4px;font-size:12px;color:#616d80">📍 ${post.address}</p>
              <p style="margin:0;font-size:12px;color:#8a9bb8;line-height:1.6">${post.excerpt}</p>
              <a href="/food/${post.slug}" style="display:inline-block;margin-top:8px;font-size:12px;color:#98c1d9;text-decoration:none;font-weight:600">查看详情 →</a>
            </div>
          `)

          marker.setPopup(popup)
          marker.togglePopup()
        })

        markersRef.current.push(marker)
      })

      if (validPosts.length > 0) {
        const bounds = new maplibregl.LngLatBounds()
        validPosts.forEach((p) => bounds.extend([p.lng, p.lat]))
        map.fitBounds(bounds, { padding: 80, maxZoom: 15 })
      }
    })

    mapRef.current = map

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [posts])

  return (
    <div
      ref={containerRef}
      className="w-full rounded-[6px] border overflow-hidden"
      style={{
        height: '450px',
        backgroundColor: '#f3f4f7',
        borderColor: 'var(--color-border)',
      }}
    />
  )
}
