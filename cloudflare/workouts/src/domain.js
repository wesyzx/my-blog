const ACTIVITY_TYPES = new Map([
  ['run', 'Run'],
  ['running', 'Run'],
  ['hkworkoutactivitytyperunning', 'Run'],
  ['ride', 'Ride'],
  ['cycling', 'Ride'],
  ['bike', 'Ride'],
  ['hkworkoutactivitytypecycling', 'Ride'],
  ['swim', 'Swim'],
  ['swimming', 'Swim'],
  ['hkworkoutactivitytypeswimming', 'Swim'],
  ['hike', 'Hike'],
  ['hiking', 'Hike'],
  ['hkworkoutactivitytypehiking', 'Hike'],
  ['walk', 'Walk'],
  ['walking', 'Walk'],
  ['hkworkoutactivitytypewalking', 'Walk'],
  ['workout', 'Workout'],
])

function cleanSource(value) {
  const source = String(value || 'manual').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  return source || 'manual'
}

function nonNegativeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

function optionalPositiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function dateKey(value, fallback) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return fallback.slice(0, 10)
}

export function normalizeActivity(input, defaultSource = 'manual', now = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Activity must be an object')

  const source = cleanSource(input.source || defaultSource)
  const sourceActivityId = String(input.sourceActivityId ?? input.id ?? '').trim()
  if (!sourceActivityId) throw new Error('Activity id is required')

  const parsedDate = new Date(input.startedAt ?? input.startTime ?? input.date)
  if (Number.isNaN(parsedDate.getTime())) throw new Error(`Activity ${sourceActivityId} has an invalid startedAt`)
  const startedAt = parsedDate.toISOString()

  const typeKey = String(input.type || 'workout').trim().toLowerCase()
  const type = ACTIVITY_TYPES.get(typeKey) || 'Workout'
  const distanceMeters = nonNegativeNumber(input.distanceMeters ?? input.distance)
  const durationSeconds = nonNegativeNumber(input.durationSeconds ?? input.duration)
  const elevationGainMeters = nonNegativeNumber(input.elevationGainMeters ?? input.elevationGain)
  const suppliedPace = optionalPositiveNumber(input.pace ?? input.paceSecondsPerKm)
  const calculatedPace = distanceMeters > 0 && durationSeconds > 0
    ? durationSeconds / (distanceMeters / 1000)
    : undefined
  let route
  if (input.publishRoute === true) {
    if (typeof input.route !== 'string' || !input.route.trim()) throw new Error(`Activity ${sourceActivityId} has an invalid route`)
    if (input.route.length > 100_000) throw new Error(`Activity ${sourceActivityId} route exceeds 100 KB`)
    route = input.route
  }

  return {
    id: `${source}:${sourceActivityId}`,
    source,
    sourceActivityId,
    type,
    startedAt,
    localDate: dateKey(input.localDate, startedAt),
    distanceMeters,
    durationSeconds,
    elevationGainMeters,
    pace: suppliedPace ?? calculatedPace,
    route,
    updatedAt: now.toISOString(),
  }
}

export function buildSnapshot(activities, now = new Date()) {
  const ordered = [...activities].sort((left, right) => right.startedAt.localeCompare(left.startedAt))
  const summary = {}
  const heatmap = new Map()

  for (const activity of ordered) {
    const year = Number(activity.localDate.slice(0, 4))
    const yearKey = String(year)
    const yearly = summary[yearKey] ?? {
      year,
      totalActivities: 0,
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      totalElevationGainMeters: 0,
    }
    yearly.totalActivities += 1
    yearly.totalDistanceMeters += activity.distanceMeters
    yearly.totalDurationSeconds += activity.durationSeconds
    yearly.totalElevationGainMeters += activity.elevationGainMeters
    summary[yearKey] = yearly

    const daily = heatmap.get(activity.localDate) ?? { date: activity.localDate, activityCount: 0, distanceMeters: 0 }
    daily.activityCount += 1
    daily.distanceMeters += activity.distanceMeters
    heatmap.set(activity.localDate, daily)
  }

  return {
    schemaVersion: 1,
    lastUpdated: now.toISOString(),
    summary,
    heatmap: Array.from(heatmap.values()).sort((left, right) => left.date.localeCompare(right.date)),
    activities: ordered.slice(0, 50).map((activity) => ({
      id: activity.id,
      type: activity.type,
      startedAt: activity.startedAt,
      distanceMeters: activity.distanceMeters,
      durationSeconds: activity.durationSeconds,
      elevationGainMeters: activity.elevationGainMeters,
      ...(activity.pace ? { pace: activity.pace } : {}),
      ...(activity.route ? { route: activity.route } : {}),
    })),
  }
}

export function buildRoutesSnapshot(activities, now = new Date()) {
  const routes = [...activities]
    .filter((activity) => typeof activity.route === 'string' && activity.route.length > 0)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .map((activity) => ({
      id: activity.id,
      type: activity.type,
      startedAt: activity.startedAt,
      distanceMeters: activity.distanceMeters,
      durationSeconds: activity.durationSeconds,
      elevationGainMeters: activity.elevationGainMeters,
      ...(activity.pace ? { pace: activity.pace } : {}),
      route: activity.route,
    }))

  return {
    schemaVersion: 1,
    lastUpdated: now.toISOString(),
    routes,
  }
}
