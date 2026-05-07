'use client'

import { useEffect, useRef } from 'react'
import type { FoodMeta } from '@/lib/food'

// 高德地图 JS API 类型声明
declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig: { securityJsCode: string }
  }
}

interface FoodMapProps {
  posts: FoodMeta[]
  amapKey: string
}

export default function FoodMap({ posts, amapKey }: FoodMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current || !amapKey) return
    loadedRef.current = true

    const scriptId = 'amap-script'
    if (document.getElementById(scriptId)) return

    const script = document.createElement('script')
    script.id = scriptId
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}`
    script.onload = () => {
      if (!mapRef.current) return
      const AMap = window.AMap
      if (!AMap) return

      // 创建地图
      const map = new AMap.Map(mapRef.current, {
        zoom: 13,
        center: [121.4737, 31.2304],
        mapStyle: 'amap://styles/light',
      })

      mapInstanceRef.current = map

      // 自定义标记：圆点 + 柔和标签
      const markers = posts
        .filter((p) => p.lng && p.lat)
        .map((post) => {
          const html = `
            <div class="food-marker" style="
              display:flex;
              flex-direction:column;
              align-items:center;
              cursor:pointer;
              transform:translate(-50%,-100%);
            ">
              <!-- 定位圆点 + 光晕 -->
              <div style="
                width:12px;height:12px;
                border-radius:50%;
                background:#c3924b;
                box-shadow:0 0 0 6px rgba(195,146,75,0.2), 0 0 0 12px rgba(195,146,75,0.08);
                transition:box-shadow 0.3s ease;
              "></div>
              <!-- 标签 -->
              <div style="
                margin-top:8px;
                padding:4px 12px;
                border-radius:999px;
                background:rgba(255,253,247,0.85);
                backdrop-filter:blur(8px);
                -webkit-backdrop-filter:blur(8px);
                color:#5a4532;
                font-size:12px;
                font-weight:500;
                letter-spacing:0.02em;
                white-space:nowrap;
                box-shadow:0 1px 4px rgba(139,113,78,0.12);
                transition:background 0.3s ease, box-shadow 0.3s ease;
              ">${post.location}</div>
            </div>
          `

          const marker = new AMap.Marker({
            position: [post.lng, post.lat],
            content: html,
            offset: new AMap.Pixel(0, 0),
          })

          // 悬停效果
          marker.on('mouseover', () => {
            const el = marker.getContent()
            if (typeof el === 'string') return
          })
          marker.on('mouseout', () => {
            const el = marker.getContent()
            if (typeof el === 'string') return
          })

          // 点击弹窗
          marker.on('click', () => {
            const infoContent = `
              <div style="padding:4px;min-width:200px">
                <h4 style="margin:0 0 6px;font-size:15px;color:#3b2818;font-family:Georgia,'Noto Serif SC',serif">${post.title}</h4>
                <p style="margin:0 0 4px;font-size:12px;color:#8b714e">📍 ${post.address}</p>
                <p style="margin:0;font-size:12px;color:#b8a080;line-height:1.6">${post.excerpt}</p>
                <a href="/food/${post.slug}" style="display:inline-block;margin-top:8px;font-size:12px;color:#c3924b;text-decoration:none;font-weight:500">查看详情 →</a>
              </div>
            `
            const infoWindow = new AMap.InfoWindow({
              content: infoContent,
              offset: new AMap.Pixel(0, -20),
            })
            infoWindow.open(map, marker.getPosition())
          })

          return marker
        })

      if (markers.length > 0) {
        map.add(markers)
        map.setFitView(null, false, [80, 80, 80, 80])
      }
    }

    document.head.appendChild(script)

    return () => {}
  }, [amapKey, posts])

  return (
    <div
      ref={mapRef}
      className="w-full rounded-[6px] border"
      style={{
        height: '450px',
        backgroundColor: 'var(--color-tag-bg)',
        borderColor: 'var(--color-border)',
      }}
    >
      {!amapKey && (
        <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--color-muted)' }}>
          🔑 请在 .env.local 中配置 NEXT_PUBLIC_AMAP_KEY 以加载地图
        </div>
      )}
    </div>
  )
}
