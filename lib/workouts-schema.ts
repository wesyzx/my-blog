// Shared shape and normalization for the public workouts snapshot.
//
// The page renders twice from two different sources: the server fetch in
// `lib/workouts.ts`, and the browser fallback in `WorkoutLiveContent` that
// calls the Worker directly. Both must run the same normalization, otherwise
// the client path would print "0 bpm" for a workout without heart-rate data.

export interface NormalizedActivity {
  id: string
  type: 'Run' | 'Ride' | 'Swim' | 'Hike' | 'Walk' | 'Stairs' | 'Workout'
  startedAt: string
  distanceMeters: number
  durationSeconds: number
  elevationGainMeters: number
  pace?: number
  activeEnergyKcal?: number
  averageHeartRateBpm?: number
  maxHeartRateBpm?: number
  averageCadenceRpm?: number
  route?: string
}

export interface NormalizedRouteActivity extends Omit<NormalizedActivity, 'route'> {
  route: string
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

export interface RoutesDataContract {
  schemaVersion: 1
  lastUpdated: string
  routes: NormalizedRouteActivity[]
}

const ACTIVITY_TYPES = new Set<NormalizedActivity['type']>(['Run', 'Ride', 'Swim', 'Hike', 'Walk', 'Stairs', 'Workout'])

export function emptyWorkoutsData(): WorkoutsDataContract {
  return { schemaVersion: 1, lastUpdated: new Date().toISOString(), summary: {}, heatmap: [], activities: [] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

// The Worker omits unmeasured fields, but older snapshots and D1 nulls can
// still arrive as `null`; treat anything non-numeric as "not measured".
function optionalPositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

function normalizeActivityRecord(item: unknown): NormalizedActivity | null {
  if (!isRecord(item) || (typeof item.id !== 'string' && typeof item.id !== 'number') || typeof item.startedAt !== 'string') return null
  if (Number.isNaN(new Date(item.startedAt).getTime())) return null

  const type = typeof item.type === 'string' && ACTIVITY_TYPES.has(item.type as NormalizedActivity['type'])
    ? item.type as NormalizedActivity['type']
    : 'Workout'
  return {
    id: String(item.id),
    type,
    startedAt: item.startedAt,
    distanceMeters: nonNegativeNumber(item.distanceMeters),
    durationSeconds: nonNegativeNumber(item.durationSeconds),
    elevationGainMeters: nonNegativeNumber(item.elevationGainMeters),
    pace: optionalPositiveNumber(item.pace),
    activeEnergyKcal: optionalPositiveNumber(item.activeEnergyKcal),
    averageHeartRateBpm: optionalPositiveNumber(item.averageHeartRateBpm),
    maxHeartRateBpm: optionalPositiveNumber(item.maxHeartRateBpm),
    averageCadenceRpm: optionalPositiveNumber(item.averageCadenceRpm),
    route: typeof item.route === 'string' && item.route.length > 0 ? item.route : undefined,
  }
}

export function normalizeWorkoutsData(value: unknown): WorkoutsDataContract | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null

  const rawActivities = Array.isArray(value.activities) ? value.activities : []
  const activities = rawActivities.flatMap<NormalizedActivity>((item) => {
    const activity = normalizeActivityRecord(item)
    return activity ? [activity] : []
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

export function normalizeRoutesData(value: unknown): RoutesDataContract | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null

  const rawRoutes = Array.isArray(value.routes) ? value.routes : []
  const routes = rawRoutes.flatMap<NormalizedRouteActivity>((item) => {
    const activity = normalizeActivityRecord(item)
    if (!activity?.route) return []
    return [{ ...activity, route: activity.route }]
  }).sort((left, right) => right.startedAt.localeCompare(left.startedAt))

  return {
    schemaVersion: 1,
    lastUpdated: typeof value.lastUpdated === 'string' ? value.lastUpdated : new Date().toISOString(),
    routes,
  }
}
