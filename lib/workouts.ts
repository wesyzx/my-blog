import 'server-only'
import { cache } from 'react'

export interface NormalizedActivity {
  id: string
  type: 'Run' | 'Ride' | 'Swim' | 'Hike' | 'Walk' | 'Workout'
  startedAt: string
  distanceMeters: number
  durationSeconds: number
  elevationGainMeters: number
  pace?: number
  route?: string
}

export interface YearlySummary {
  year: number
  totalActivities: number
  totalDistanceMeters: number
  totalDurationSeconds: number
  totalElevationGainMeters: number
}

export interface HeatmapNode {
  date: string
  activityCount: number
  distanceMeters?: number
}

export interface WorkoutsDataContract {
  schemaVersion: 1
  lastUpdated: string
  summary: Record<string, YearlySummary>
  heatmap: HeatmapNode[]
  activities: NormalizedActivity[]
}

const ACTIVITY_TYPES = new Set<NormalizedActivity['type']>(['Run', 'Ride', 'Swim', 'Hike', 'Walk', 'Workout'])

function emptyData(): WorkoutsDataContract {
  return { schemaVersion: 1, lastUpdated: new Date().toISOString(), summary: {}, heatmap: [], activities: [] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function normalizeData(value: unknown): WorkoutsDataContract | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null

  const rawActivities = Array.isArray(value.activities) ? value.activities : []
  const activities = rawActivities.flatMap<NormalizedActivity>((item) => {
    if (!isRecord(item) || (typeof item.id !== 'string' && typeof item.id !== 'number') || typeof item.startedAt !== 'string') return []
    if (Number.isNaN(new Date(item.startedAt).getTime())) return []

    const type = typeof item.type === 'string' && ACTIVITY_TYPES.has(item.type as NormalizedActivity['type'])
      ? item.type as NormalizedActivity['type']
      : 'Workout'
    const pace = nonNegativeNumber(item.pace)
    return [{
      id: String(item.id),
      type,
      startedAt: item.startedAt,
      distanceMeters: nonNegativeNumber(item.distanceMeters),
      durationSeconds: nonNegativeNumber(item.durationSeconds),
      elevationGainMeters: nonNegativeNumber(item.elevationGainMeters),
      pace: pace > 0 ? pace : undefined,
      route: typeof item.route === 'string' && item.route.length > 0 ? item.route : undefined,
    }]
  }).sort((left, right) => right.startedAt.localeCompare(left.startedAt))

  const heatmap = (Array.isArray(value.heatmap) ? value.heatmap : []).flatMap<HeatmapNode>((item) => {
    if (!isRecord(item) || typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return []
    return [{
      date: item.date,
      activityCount: nonNegativeNumber(item.activityCount),
      distanceMeters: nonNegativeNumber(item.distanceMeters) || undefined,
    }]
  })

  const summary: Record<string, YearlySummary> = {}
  if (isRecord(value.summary)) {
    for (const [key, item] of Object.entries(value.summary)) {
      if (!isRecord(item)) continue
      const year = Number(item.year ?? key)
      if (!Number.isInteger(year) || year < 2000 || year > 2200) continue
      summary[String(year)] = {
        year,
        totalActivities: nonNegativeNumber(item.totalActivities),
        totalDistanceMeters: nonNegativeNumber(item.totalDistanceMeters),
        totalDurationSeconds: nonNegativeNumber(item.totalDurationSeconds),
        totalElevationGainMeters: nonNegativeNumber(item.totalElevationGainMeters),
      }
    }
  }

  return {
    schemaVersion: 1,
    lastUpdated: typeof value.lastUpdated === 'string' ? value.lastUpdated : new Date().toISOString(),
    summary,
    heatmap,
    activities,
  }
}

export const getWorkoutsData = cache(async (): Promise<WorkoutsDataContract> => {
  const url = process.env.WORKOUTS_API_URL
  if (!url) {
    console.warn('WORKOUTS_API_URL is not set, returning empty data')
    return emptyData()
  }

  try {
    // Refresh frequently enough for a newly uploaded workout to appear promptly.
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) {
      console.warn(`Failed to fetch workouts data: ${res.status} ${res.statusText}`)
      return emptyData()
    }
    const data = normalizeData(await res.json())
    if (!data) {
      console.warn('Invalid workouts data contract')
      return emptyData()
    }
    return data
  } catch (error) {
    console.warn('Error fetching workouts data:', error)
    return emptyData()
  }
})
