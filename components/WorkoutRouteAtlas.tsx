'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { workoutRoutesUrl } from '@/lib/workout-routes'
import { decodeWorkoutRoute } from '@/lib/workout-route.mjs'
import {
  normalizeRoutesData,
  type NormalizedActivity,
  type NormalizedRouteActivity,
  type RoutesDataContract,
} from '@/lib/workouts-schema'
import {
  boundsOf,
  loadTMap,
  mapOptions,
  TMAP_KEY_MISSING,
  TMAP_STYLE_ID,
  type TMapLatLng,
  type TMapMap,
  type TMapNamespace,
} from '@/lib/tmap'

type RouteType = NormalizedActivity['type']
type TypeFilter = RouteType | 'all'

interface RoutePath {
  activity: NormalizedRouteActivity
  points: TMapLatLng[]
}

interface TypeAppearance {
  label: string
  color: string
}

const TYPE_APPEARANCE: Record<RouteType, TypeAppearance> = {
  Run: { label: '跑步', color: '#ad6047' },
  Ride: { label: '骑行', color: '#4d7183' },
  Swim: { label: '游泳', color: '#4f7e99' },
  Hike: { label: '徒步', color: '#6f7649' },
  Walk: { label: '步行', color: '#52704b' },
  Stairs: { label: '爬楼', color: '#8a7147' },
  Workout: { label: '训练', color: '#6d687a' },
}

const TYPE_ORDER = Object.keys(TYPE_APPEARANCE) as RouteType[]

function decodeRoutes(routes: NormalizedRouteActivity[]) {
  return routes.flatMap<RoutePath>((activity) => {
    const points = decodeWorkoutRoute(activity.route)
    return points.length > 0 ? [{ activity, points }] : []
  })
}

function formatDate(isoStr: string) {
  const date = new Date(isoStr)
  if (Number.isNaN(date.getTime())) return '时间待定'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatDistance(meters: number) {
  return `${(meters / 1000).toFixed(2)} km`
}

function filterPaths(paths: RoutePath[], typeFilter: TypeFilter, yearFilter: string) {
  return paths.filter((path) => (
    (typeFilter === 'all' || path.activity.type === typeFilter)
    && (yearFilter === 'all' || path.activity.startedAt.startsWith(`${yearFilter}-`))
  ))
}

function fitPath(map: TMapMap, TMap: TMapNamespace, paths: RoutePath[]) {
  if (paths.length === 0) return

  if (paths.length === 1) {
    const { southWest, northEast } = boundsOf(paths[0].points)
    map.fitBounds(
      new TMap.LatLngBounds(
        new TMap.LatLng(southWest.lat, southWest.lng),
        new TMap.LatLng(northEast.lat, northEast.lng),
      ),
      { padding: 40, maxZoom: 16 },
    )
    return
  }

  const { southWest, northEast } = boundsOf(paths.flatMap((path) => path.points))
  map.fitBounds(
    new TMap.LatLngBounds(
      new TMap.LatLng(southWest.lat, southWest.lng),
      new TMap.LatLng(northEast.lat, northEast.lng),
    ),
    { padding: 56, maxZoom: 15 },
  )
}

function createPolylineLayer(TMap: TMapNamespace, map: TMapMap, paths: RoutePath[]) {
  const styles = Object.fromEntries(TYPE_ORDER.map((type) => [
    type,
    new TMap.PolylineStyle({
      color: TYPE_APPEARANCE[type].color,
      // TMap validates width as an integer. A decimal value is ignored and
      // leaves the polyline style without a width.
      width: 4,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,.72)',
      lineCap: 'round',
    }),
  ]))

  return new TMap.MultiPolyline({
    id: 'workout-route-atlas',
    map,
    styles,
    geometries: paths.map((path) => ({
      id: path.activity.id,
      styleId: path.activity.type,
      // TMap calls this `paths`, not `path`; the latter silently renders an
      // empty geometry.
      paths: path.points.map((point) => new TMap.LatLng(point.lat, point.lng)),
    })),
  })
}

export default function WorkoutRouteAtlas({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<TMapMap | null>(null)
  const namespaceRef = useRef<TMapNamespace | null>(null)
  const layerRef = useRef<{ setMap(map: TMapMap | null): void } | null>(null)
  const [data, setData] = useState<RoutesDataContract | null>(null)
  const [decodedPaths, setDecodedPaths] = useState<RoutePath[]>([])
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [error, setError] = useState('')
  const availableTypes = useMemo(
    () => TYPE_ORDER.filter((type) => data?.routes.some((activity) => activity.type === type)),
    [data],
  )
  const availableYears = useMemo(
    () => Array.from(new Set(data?.routes.map((activity) => activity.startedAt.slice(0, 4)) ?? []))
      .sort((left, right) => right.localeCompare(left)),
    [data],
  )
  const selectedType = typeFilter === 'all' || availableTypes.includes(typeFilter) ? typeFilter : 'all'
  const selectedYear = yearFilter === 'all' || availableYears.includes(yearFilter) ? yearFilter : 'all'

  useEffect(() => {
    const controller = new AbortController()

    fetch(workoutRoutesUrl(), { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<unknown>
      })
      .then((payload) => {
        const routes = normalizeRoutesData(payload)
        if (!routes) throw new Error('数据格式不兼容')
        setData(routes)
        setDecodedPaths(decodeRoutes(routes.routes))
        setError('')
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError('暂时无法读取路线数据。')
      })

    return () => controller.abort()
  }, [])

  const visiblePaths = filterPaths(decodedPaths, selectedType, selectedYear)

  const hasNoRoutes = data !== null && data.routes.length === 0

  useEffect(() => {
    const container = containerRef.current
    if (!container || TMAP_KEY_MISSING || decodedPaths.length === 0) return

    let disposed = false
    let map: TMapMap | null = null
    let namespace: TMapNamespace | null = null

    loadTMap()
      .then((TMap) => {
        if (disposed) return
        namespace = TMap
        namespaceRef.current = namespace
        map = new namespace.Map(container, mapOptions(
          new namespace.LatLng(29.8786, 121.5519),
          10,
          TMAP_STYLE_ID,
        ))

        if (disposed) {
          map.destroy()
          return
        }

        mapRef.current = map
        layerRef.current = createPolylineLayer(namespace, map, decodedPaths)
        fitPath(map, namespace, decodedPaths)
      })
      .catch((reason: Error) => {
        if (!disposed) setError(reason.message)
      })

    return () => {
      disposed = true
      layerRef.current?.setMap(null)
      if (map) {
        map.destroy()
        mapRef.current = null
        namespaceRef.current = null
        layerRef.current = null
      }
    }
  }, [decodedPaths])

  useEffect(() => {
    const map = mapRef.current
    const TMap = namespaceRef.current
    if (!map || !TMap) return

    const activePaths = filterPaths(decodedPaths, selectedType, selectedYear)
    layerRef.current?.setMap(null)
    layerRef.current = createPolylineLayer(TMap, map, activePaths)
    fitPath(map, TMap, activePaths)
  }, [selectedType, selectedYear, decodedPaths])

  if (TMAP_KEY_MISSING) {
    return <div className="map-key-notice"><p>轨迹地图暂时无法显示。</p></div>
  }

  if (error && data === null) return <div className="map-key-notice"><p>{error}</p></div>
  if (hasNoRoutes) return <div className="map-key-notice"><p>还没有公开的运动轨迹。</p></div>
  if (data === null) return <div className="workout-route-loading">正在读取全部轨迹…</div>

  return (
    <div className={`workout-route-atlas ${className}`}>
      <div className="workout-route-filters">
        <div className="workout-route-filter-group" role="group" aria-label="按运动类型筛选">
          <span>类型</span>
          <button
            type="button"
            className={selectedType === 'all' ? 'is-active' : undefined}
            aria-pressed={selectedType === 'all'}
            onClick={() => setTypeFilter('all')}
          >
            全部
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={selectedType === type ? 'is-active' : undefined}
              aria-pressed={selectedType === type}
              onClick={() => setTypeFilter(type)}
            >
              <i style={{ background: TYPE_APPEARANCE[type].color }} />
              {TYPE_APPEARANCE[type].label}
            </button>
          ))}
        </div>
        <label className="workout-route-year">
          <span>年份</span>
          <select value={selectedYear} onChange={(event) => setYearFilter(event.target.value)}>
            <option value="all">全部</option>
            {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>
      <div className="workout-route-canvas">
        <div ref={containerRef} aria-label="全部运动轨迹地图" />
        <div className="workout-route-count" aria-live="polite">
          {visiblePaths.length} / {data.routes.length} 条轨迹
        </div>
      </div>
      <div className="workout-route-list" aria-label="轨迹列表">
        {visiblePaths.map((path, index) => (
          <button
            key={path.activity.id}
            type="button"
            className="workout-route-item"
            onClick={() => {
              const map = mapRef.current
              const TMap = namespaceRef.current
              if (!map || !TMap) return
              fitPath(map, TMap, [path])
            }}
          >
            <span className="workout-route-item-index" style={{ color: TYPE_APPEARANCE[path.activity.type].color }}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="workout-route-item-copy">
              <strong>{TYPE_APPEARANCE[path.activity.type].label}</strong>
              <time dateTime={path.activity.startedAt}>{formatDate(path.activity.startedAt)}</time>
            </span>
            <span className="workout-route-item-distance">{formatDistance(path.activity.distanceMeters)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
