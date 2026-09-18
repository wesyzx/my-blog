/**
 * 腾讯地图 GL JS 的浏览器端加载器。
 *
 * SDK 只能在客户端加载，且需要自己的 Key（腾讯位置服务 → 控制台 → 创建应用 → Web 端 JS API）。
 * Key 通过 NEXT_PUBLIC_TMAP_KEY 注入，**不要写死在代码里**。
 * 上线前记得在控制台配置 Referer 白名单（填站点域名），否则 Key 会被盗用。
 */

export const TMAP_KEY = process.env.NEXT_PUBLIC_TMAP_KEY || ''
export const TMAP_KEY_MISSING = TMAP_KEY.length === 0

export interface TMapLatLng { lat: number; lng: number }
export interface TMapBounds { __bounds?: never }

export interface TMapMap {
  setCenter(center: TMapLatLng): void
  setZoom(zoom: number): void
  getCenter(): TMapLatLng
  getZoom(): number
  fitBounds(bounds: TMapBounds, options?: { padding?: number; maxZoom?: number }): void
  on(event: string, listener: (event: { geometry?: { id?: string } }) => void): void
  off(event: string, listener: (event: { geometry?: { id?: string } }) => void): void
  destroy(): void
}

export interface TMapLayer {
  setMap(map: TMapMap | null): void
  on(event: string, listener: (event: { geometry?: { id?: string } }) => void): void
  off(event: string, listener: (event: { geometry?: { id?: string } }) => void): void
}

export interface TMapInfoWindow {
  setPosition(position: TMapLatLng): void
  setContent(content: string): void
  open(): void
  close(): void
  destroy(): void
}

export interface TMapNamespace {
  Map: new (container: HTMLElement | string, options: Record<string, unknown>) => TMapMap
  LatLng: new (lat: number, lng: number) => TMapLatLng
  LatLngBounds: new (southWest: TMapLatLng, northEast: TMapLatLng) => TMapBounds
  MultiMarker: new (options: Record<string, unknown>) => TMapLayer
  MultiPolyline: new (options: Record<string, unknown>) => TMapLayer
  MultiLabel: new (options: Record<string, unknown>) => TMapLayer
  MarkerStyle: new (options: Record<string, unknown>) => unknown
  PolylineStyle: new (options: Record<string, unknown>) => unknown
  LabelStyle: new (options: Record<string, unknown>) => unknown
  InfoWindow: new (options: Record<string, unknown>) => TMapInfoWindow
}

declare global {
  interface Window { TMap?: TMapNamespace }
}

let pending: Promise<TMapNamespace> | null = null

/** 幂等加载 SDK；同一页面多次调用只会插入一个 script 标签 */
export function loadTMap(): Promise<TMapNamespace> {
  if (typeof window === 'undefined') return Promise.reject(new Error('腾讯地图 SDK 只能在浏览器中加载'))
  if (window.TMap) return Promise.resolve(window.TMap)
  if (pending) return pending

  pending = new Promise<TMapNamespace>((resolve, reject) => {
    if (TMAP_KEY_MISSING) {
      reject(new Error('未配置 NEXT_PUBLIC_TMAP_KEY'))
      return
    }
    const script = document.createElement('script')
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${encodeURIComponent(TMAP_KEY)}`
    script.async = true
    script.onload = () => {
      if (window.TMap) resolve(window.TMap)
      else reject(new Error('腾讯地图 SDK 已加载但未挂载 TMap'))
    }
    script.onerror = () => {
      pending = null
      reject(new Error('腾讯地图 SDK 加载失败，请检查网络或 Key 是否有效'))
    }
    document.head.appendChild(script)
  })

  return pending
}

/** 用一组坐标点算出西南 / 东北角，供 fitBounds 使用 */
export function boundsOf(points: TMapLatLng[]) {
  let minLat = points[0].lat, maxLat = points[0].lat
  let minLng = points[0].lng, maxLng = points[0].lng
  for (const point of points) {
    if (point.lat < minLat) minLat = point.lat
    if (point.lat > maxLat) maxLat = point.lat
    if (point.lng < minLng) minLng = point.lng
    if (point.lng > maxLng) maxLng = point.lng
  }
  return { southWest: { lat: minLat, lng: minLng }, northEast: { lat: maxLat, lng: maxLng } }
}
