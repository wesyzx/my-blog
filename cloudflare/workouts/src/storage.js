import { buildRoutesSnapshot, buildSnapshot } from './domain.js'

const UPSERT_SQL = `
  INSERT INTO activities (
    id, source, source_activity_id, type, started_at, local_date,
    distance_meters, duration_seconds, elevation_gain_meters,
    pace_seconds_per_km, route_polyline, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    type = excluded.type,
    started_at = excluded.started_at,
    local_date = excluded.local_date,
    distance_meters = excluded.distance_meters,
    duration_seconds = excluded.duration_seconds,
    elevation_gain_meters = excluded.elevation_gain_meters,
    pace_seconds_per_km = excluded.pace_seconds_per_km,
    route_polyline = excluded.route_polyline,
    updated_at = excluded.updated_at
`

function chunks(items, size) {
  const result = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

export async function upsertActivities(db, activities) {
  for (const batch of chunks(activities, 50)) {
    await db.batch(batch.map((activity) => db.prepare(UPSERT_SQL).bind(
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
