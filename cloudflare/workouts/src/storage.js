import { buildRoutesSnapshot, buildSnapshot } from './domain.js'

const UPSERT_SQL = `
  INSERT INTO activities (
    id, source, source_activity_id, type, started_at, local_date,
    distance_meters, duration_seconds, elevation_gain_meters,
    pace_seconds_per_km, active_energy_kcal, average_heart_rate_bpm,
    max_heart_rate_bpm, average_cadence_rpm, route_polyline, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

function updateAssignments(activity) {
  const provided = new Set(activity.providedFields)
  const updates = ['started_at = excluded.started_at', 'updated_at = excluded.updated_at']
  const columns = {
    type: 'type',
    localDate: 'local_date',
    distanceMeters: 'distance_meters',
    durationSeconds: 'duration_seconds',
    elevationGainMeters: 'elevation_gain_meters',
    route: 'route_polyline',
  }
  for (const [field, column] of Object.entries(columns)) {
    if (provided.has(field)) updates.push(`${column} = excluded.${column}`)
  }
  for (const column of ['active_energy_kcal', 'average_heart_rate_bpm', 'max_heart_rate_bpm', 'average_cadence_rpm']) {
    updates.push(`${column} = COALESCE(excluded.${column}, activities.${column})`)
  }

  if (provided.has('pace')) {
    updates.push('pace_seconds_per_km = excluded.pace_seconds_per_km')
  } else if (provided.has('distanceMeters') || provided.has('durationSeconds')) {
    // Recalculate using the retained distance/duration when only one is sent.
    const distance = provided.has('distanceMeters') ? 'excluded.distance_meters' : 'activities.distance_meters'
    const duration = provided.has('durationSeconds') ? 'excluded.duration_seconds' : 'activities.duration_seconds'
    updates.push(`pace_seconds_per_km = CASE WHEN ${distance} > 0 AND ${duration} > 0 THEN ${duration} / (${distance} / 1000.0) ELSE NULL END`)
  }
  return updates.join(', ')
}

function chunks(items, size) {
  const result = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

export async function upsertActivities(db, activities) {
  for (const batch of chunks(activities, 50)) {
    await db.batch(batch.map((activity) => db.prepare(`${UPSERT_SQL} ON CONFLICT(id) DO UPDATE SET ${updateAssignments(activity)}`).bind(
      activity.id,
      activity.source,
      activity.sourceActivityId,
      activity.type,
      activity.startedAt,
      activity.localDate,
      activity.distanceMeters,
      activity.durationSeconds,
      activity.elevationGainMeters,
      activity.pace ?? null,
      activity.activeEnergyKcal ?? null,
      activity.averageHeartRateBpm ?? null,
      activity.maxHeartRateBpm ?? null,
      activity.averageCadenceRpm ?? null,
      activity.route ?? null,
      activity.updatedAt,
    )))
  }
  return activities.length
}

export async function getCursor(db, source) {
  const row = await db.prepare('SELECT cursor FROM sync_cursors WHERE source = ?').bind(source).first()
  return row?.cursor || null
}

/**
 * Locate the workout a GPX file belongs to. Exports do not carry the HealthKit
 * UUID, so the caller either names the workout or supplies the track start time.
 */
export async function findActivityForRoute(db, { source, sourceActivityId, startedAt, toleranceSeconds = 300 }) {
  if (sourceActivityId) {
    return await db.prepare(`
      SELECT id, source_activity_id AS sourceActivityId, started_at AS startedAt,
             distance_meters AS distanceMeters, elevation_gain_meters AS elevationGainMeters,
             route_polyline AS route
      FROM activities WHERE source = ? AND source_activity_id = ?
    `).bind(source, sourceActivityId).first() ?? null
  }
  if (!startedAt) return null

  const center = new Date(startedAt).getTime()
  if (!Number.isFinite(center)) return null
  const from = new Date(center - toleranceSeconds * 1000).toISOString()
  const to = new Date(center + toleranceSeconds * 1000).toISOString()
  return await db.prepare(`
    SELECT id, source_activity_id AS sourceActivityId, started_at AS startedAt,
           distance_meters AS distanceMeters, elevation_gain_meters AS elevationGainMeters,
           route_polyline AS route
    FROM activities WHERE source = ? AND started_at BETWEEN ? AND ?
    ORDER BY ABS(julianday(started_at) - julianday(?)) LIMIT 1
  `).bind(source, from, to, startedAt).first() ?? null
}

/**
 * Attach a decoded track to an existing workout. Summary metrics already
 * measured by Apple Health win; GPX values only fill genuine gaps.
 */
export async function attachRoute(db, activity, route) {
  const distance = activity.distanceMeters > 0 ? activity.distanceMeters : route.distanceMeters
  const elevation = activity.elevationGainMeters > 0 ? activity.elevationGainMeters : route.elevationGainMeters
  await db.prepare(`
    UPDATE activities SET
      route_polyline = ?,
      distance_meters = ?,
      elevation_gain_meters = ?,
      pace_seconds_per_km = CASE WHEN ? > 0 THEN duration_seconds / (? / 1000.0) ELSE pace_seconds_per_km END,
      updated_at = ?
    WHERE id = ?
  `).bind(route.polyline, distance, elevation, distance, distance, new Date().toISOString(), activity.id).run()
  return { distanceMeters: distance, elevationGainMeters: elevation }
}

export async function recordSync(db, source, { cursor = null, status, error = null, syncedAt = new Date().toISOString() }) {
  await db.prepare(`
    INSERT INTO sync_cursors (source, cursor, last_synced_at, status, last_error)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(source) DO UPDATE SET
      cursor = COALESCE(excluded.cursor, sync_cursors.cursor),
      last_synced_at = excluded.last_synced_at,
      status = excluded.status,
      last_error = excluded.last_error
  `).bind(source, cursor, syncedAt, status, error).run()
}

export async function loadActivities(db) {
  const result = await db.prepare(`
    SELECT
      id,
      source,
      source_activity_id AS sourceActivityId,
      type,
      started_at AS startedAt,
      local_date AS localDate,
      distance_meters AS distanceMeters,
      duration_seconds AS durationSeconds,
      elevation_gain_meters AS elevationGainMeters,
      pace_seconds_per_km AS pace,
      active_energy_kcal AS activeEnergyKcal,
      average_heart_rate_bpm AS averageHeartRateBpm,
      max_heart_rate_bpm AS maxHeartRateBpm,
      average_cadence_rpm AS averageCadenceRpm,
      route_polyline AS route,
      updated_at AS updatedAt
    FROM activities
    ORDER BY started_at DESC
    LIMIT 10000
  `).all()
  return result.results || []
}

export async function createAndStoreSnapshot(env, now = new Date()) {
  const activities = await loadActivities(env.DB)
  const snapshot = buildSnapshot(activities, now)
  const routesSnapshot = buildRoutesSnapshot(activities, now)
  const body = JSON.stringify(snapshot)
  const routesBody = JSON.stringify(routesSnapshot)
  const metadata = {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8',
      cacheControl: 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400',
    },
    customMetadata: { lastUpdated: snapshot.lastUpdated, schemaVersion: String(snapshot.schemaVersion) },
  }
  await env.SNAPSHOTS.put(env.SNAPSHOT_KEY || 'v1/workouts.json', body, {
    ...metadata,
  })
  await env.SNAPSHOTS.put(env.ROUTES_SNAPSHOT_KEY || 'v1/routes.json', routesBody, {
    ...metadata,
    customMetadata: { lastUpdated: routesSnapshot.lastUpdated, schemaVersion: String(routesSnapshot.schemaVersion) },
  })
  return { ...snapshot, routes: routesSnapshot.routes }
}
