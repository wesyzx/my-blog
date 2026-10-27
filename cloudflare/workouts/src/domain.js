import { normalizeWorkoutType } from '../../../lib/workout-types.mjs'

function cleanSource(value) {
  const source = String(value || 'manual').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  return source || 'manual'
}

function hasValue(value) {
  return value !== undefined && value !== null && !(typeof value === 'string' && !value.trim())
}

function nonNegativeNumber(value) {
  if (!hasValue(value)) return 0
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) throw new Error('Metrics must contain non-negative numbers without units')
  return number
}

function optionalPositiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function optionalNonNegativeNumber(value) {
  if (!hasValue(value)) return undefined
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) throw new Error('Metrics must contain non-negative numbers without units')
  return number
}

// Shortcuts' Calculate Statistics action returns 0 (or an empty string) when a
// workout has no heart-rate samples. A real heart rate is never zero, so treat
// anything that is not positive as unmeasured instead of publishing "0 bpm".
function optionalHeartRate(value) {
  if (!hasValue(value)) return undefined
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) throw new Error('Metrics must contain non-negative numbers without units')
  return number > 0 ? number : undefined
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

  const originalDate = input.startedAt ?? input.startTime ?? input.date
  const parsedDate = new Date(originalDate)
  if (Number.isNaN(parsedDate.getTime())) throw new Error(`Activity ${sourceActivityId} has an invalid startedAt`)
  const startedAt = parsedDate.toISOString()

  const sourceType = String(input.sourceType || input.type || 'Workout').trim()
  const distanceMeters = nonNegativeNumber(input.distanceMeters ?? input.distance)
  const type = normalizeWorkoutType(sourceType, distanceMeters)
  const durationSeconds = nonNegativeNumber(input.durationSeconds ?? input.duration)
  const elevationGainMeters = nonNegativeNumber(input.elevationGainMeters ?? input.elevationGain)
  const flightsClimbed = optionalPositiveNumber(input.flightsClimbed ?? input.stairsClimbed)
  const suppliedPace = optionalPositiveNumber(input.pace ?? input.paceSecondsPerKm)
  const activeEnergyKcal = optionalNonNegativeNumber(input.activeEnergyKcal ?? input.calories ?? input.energyKcal)
  const averageHeartRateBpm = optionalHeartRate(input.averageHeartRateBpm ?? input.avgHeartRateBpm)
  const maxHeartRateBpm = optionalHeartRate(input.maxHeartRateBpm)
  const averageCadenceRpm = optionalNonNegativeNumber(input.averageCadenceRpm ?? input.avgCadenceRpm)
  const calculatedPace = distanceMeters > 0 && durationSeconds > 0
    ? durationSeconds / (distanceMeters / 1000)
    : undefined
  let route
  if (input.publishRoute === true) {
    if (typeof input.route !== 'string' || !input.route.trim()) throw new Error(`Activity ${sourceActivityId} has an invalid route`)
    if (input.route.length > 100_000) throw new Error(`Activity ${sourceActivityId} route exceeds 100 KB`)
    route = input.route
  }

  // Keep presence separate from insert defaults so a summary-only retry cannot
  // erase metrics or a route supplied by another import of the same workout.
  // Optional metrics are not tracked in `supplied`: their SQL updates use
  // COALESCE so an omitted or null property preserves a previously measured
  // value, regardless of whether the shortcut emitted the key at all.
  const supplied = {
    type: input.sourceType || input.type,
    sourceType: input.sourceType || input.type,
    localDate: input.localDate,
    distanceMeters: input.distanceMeters ?? input.distance,
    durationSeconds: input.durationSeconds ?? input.duration,
    elevationGainMeters: input.elevationGainMeters ?? input.elevationGain,
    pace: suppliedPace,
  }
  const providedFields = Object.keys(supplied).filter((key) => hasValue(supplied[key]))
  if (typeof input.publishRoute === 'boolean') providedFields.push('route')
  const dateFallback = typeof originalDate === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(originalDate)
    ? originalDate
    : startedAt

  return {
    id: `${source}:${sourceActivityId}`,
    source,
    sourceActivityId,
    sourceType,
    type,
    startedAt,
    localDate: dateKey(input.localDate, dateFallback),
    distanceMeters,
    durationSeconds,
    elevationGainMeters,
    flightsClimbed,
    stepsClimbed: optionalPositiveNumber(input.stepsClimbed),
    pace: suppliedPace ?? calculatedPace,
    activeEnergyKcal,
    averageHeartRateBpm,
    maxHeartRateBpm,
    averageCadenceRpm,
    route,
    providedFields,
    updatedAt: now.toISOString(),
  }
}

// D1 returns NULL for every unmeasured column, so a naive `!== undefined`
// check would publish `"averageHeartRateBpm": null` and the page would print
// "0 bpm" for a workout that simply has no heart-rate samples.
function optionalNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function publicActivity(activity) {
  const pace = optionalNumber(activity.pace)
  const activeEnergyKcal = optionalNumber(activity.activeEnergyKcal)
  const averageHeartRateBpm = optionalNumber(activity.averageHeartRateBpm)
  const maxHeartRateBpm = optionalNumber(activity.maxHeartRateBpm)
  const averageCadenceRpm = optionalNumber(activity.averageCadenceRpm)
  const flightsClimbed = optionalNumber(activity.flightsClimbed)
  const stepsClimbed = optionalNumber(activity.stepsClimbed)
  return {
    id: activity.id,
    type: normalizeWorkoutType(activity.sourceType || activity.type, activity.distanceMeters),
    startedAt: activity.startedAt,
    distanceMeters: activity.distanceMeters,
    durationSeconds: activity.durationSeconds,
    elevationGainMeters: activity.elevationGainMeters,
    ...(flightsClimbed !== undefined ? { flightsClimbed } : {}),
    ...(stepsClimbed !== undefined ? { stepsClimbed } : {}),
    ...(pace ? { pace } : {}),
    ...(activeEnergyKcal !== undefined ? { activeEnergyKcal } : {}),
    ...(averageHeartRateBpm !== undefined ? { averageHeartRateBpm } : {}),
    ...(maxHeartRateBpm !== undefined ? { maxHeartRateBpm } : {}),
    ...(averageCadenceRpm !== undefined ? { averageCadenceRpm } : {}),
    ...(activity.route ? { route: activity.route } : {}),
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
      totalActiveEnergyKcal: 0,
      activeEnergyActivityCount: 0,
    }
    yearly.totalActivities += 1
    yearly.totalDistanceMeters += activity.distanceMeters
    yearly.totalDurationSeconds += activity.durationSeconds
    yearly.totalElevationGainMeters += activity.elevationGainMeters
    const energy = optionalNumber(activity.activeEnergyKcal)
    if (energy !== undefined && energy >= 0) {
      yearly.totalActiveEnergyKcal += energy
      yearly.activeEnergyActivityCount += 1
    }
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
    activities: ordered.slice(0, 50).map(publicActivity),
  }
}

export function buildRoutesSnapshot(activities, now = new Date()) {
  const routes = [...activities]
    .filter((activity) => typeof activity.route === 'string' && activity.route.length > 0)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .map(publicActivity)

  return {
    schemaVersion: 1,
    lastUpdated: now.toISOString(),
    routes,
  }
}
