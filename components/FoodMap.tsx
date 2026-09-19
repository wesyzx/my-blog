'use client'

import { useEffect, useRef, useState } from 'react'
import type { FoodMeta } from '@/lib/food'
import { wgs84ToGcj02 } from '@/lib/geo'
import {
  boundsOf,
  loadTMap,
  TMAP_KEY_MISSING,
  type TMapInfoWindow,
  type TMapLatLng,
  type TMapMap,
} from '@/lib/tmap'

/** 水滴形标记，沿用站点原有的暖色（--color-warm #a96545）与白色描边 */
const PIN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">'
  + '<path d="M13 33.2C13 33.2 24.6 19.6 24.6 12.6A11.6 11.6 0 1 0 1.4 12.6C1.4 19.6 13 33.2 13 33.2Z" fill="#a96545" stroke="#ffffff" stroke-width="2.4"/>'
  + '<circle cx="13" cy="12.6" r="4" fill="#ffffff"/></svg>'
const PIN_SRC = `data:image/svg+xml,${encodeURIComponent(PIN_SVG)}`

/** 没有点位时的默认视野：宁波市中心 */
const DEFAULT_CENTER: TMapLatLng = { lat: 29.8786, lng: 121.5519 }

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

function escapeHtml(value: string) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
}

function popupHtml(post: FoodMeta) {
  const address = post.address || post.location
  const excerpt = post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : ''
  return `<div class="food-popup-content">`
    + `<h4>${escapeHtml(post.title)}</h4>`
    + `<p>${escapeHtml(address)}</p>`
    + excerpt
    + `<a href="/food/${encodeURIComponent(post.slug)}">查看详情 →</a>`
    + `</div>`
}

export default function FoodMap({ posts }: { posts: FoodMeta[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (!container || TMAP_KEY_MISSING) return

    let disposed = false
    let map: TMapMap | null = null

    // 数据里存的是 WGS-84，腾讯底图用 GCJ-02，必须转换后再上图，否则会偏移约 500 米
    const spots = posts
      .filter((post) => post.lng && post.lat)
      .map((post) => {
        const [lng, lat] = wgs84ToGcj02(post.lng, post.lat)
        return { post, position: { lat, lng } as TMapLatLng }
      })

    loadTMap()
      .then((TMap) => {
        if (disposed) return
        const start = spots[0]?.position ?? DEFAULT_CENTER

        map = new TMap.Map(container, {
          center: new TMap.LatLng(start.lat, start.lng),
          zoom: 13,
          pitch: 0,
          rotation: 0,
          viewMode: '2D',
        })
        if (disposed) return

        const infoWindow: TMapInfoWindow = new TMap.InfoWindow({
          map,
          position: new TMap.LatLng(start.lat, start.lng),
          offset: { x: 0, y: -34 },
          content: '',
        })
        infoWindow.close()

        const markers = new TMap.MultiMarker({
          id: 'food-markers',
          map,
          styles: {
            spot: new TMap.MarkerStyle({ width: 26, height: 34, anchor: { x: 13, y: 34 }, src: PIN_SRC }),
          },
          geometries: spots.map((spot) => ({
            id: spot.post.slug,
            styleId: 'spot',
            position: new TMap.LatLng(spot.position.lat, spot.position.lng),
          })),
        })

        const openPopup = (slug?: string) => {
          const spot = spots.find((item) => item.post.slug === slug)
          if (!spot) return
          infoWindow.setPosition(new TMap.LatLng(spot.position.lat, spot.position.lng))
          infoWindow.setContent(popupHtml(spot.post))
          infoWindow.open()
        }

        markers.on('click', (event) => openPopup(event.geometry?.id))

        if (spots.length === 1) {
          map.setCenter(new TMap.LatLng(spots[0].position.lat, spots[0].position.lng))
          map.setZoom(15)
        } else if (spots.length > 1) {
          const { southWest, northEast } = boundsOf(spots.map((spot) => spot.position))
          map.fitBounds(
            new TMap.LatLngBounds(
              new TMap.LatLng(southWest.lat, southWest.lng),
              new TMap.LatLng(northEast.lat, northEast.lng),
            ),
            { padding: 80, maxZoom: 15 },
          )
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
  }, [posts])

  if (TMAP_KEY_MISSING) {
    return (
      <div className="map-key-notice">
        <p><strong>地图需要配置腾讯位置服务的 Key</strong></p>
        <p>去腾讯位置服务控制台创建应用并申请 <em>Web 端 (JavaScript API GL)</em> 类型的 Key，然后写入环境变量 <code>NEXT_PUBLIC_TMAP_KEY</code>（本地写在 <code>.env.local</code>，线上在 EdgeOne 的构建环境变量里配置）。</p>
        <p>记得在控制台配置 Referer 白名单，填上站点域名。</p>
      </div>
    )
  }

  if (error) return <div className="map-key-notice"><p>{error}</p></div>

  return <div ref={containerRef} className="food-map" />
}
