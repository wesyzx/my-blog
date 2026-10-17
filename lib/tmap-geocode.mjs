import { wgs84ToGcj02 } from './geo.mjs'

const ENDPOINT = 'https://apis.map.qq.com/ws/geocoder/v1/'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const FAILURE_TTL_MS = 30 * 1000
const MAX_CONCURRENCY = 4
const labelCache = new Map()
const failureCache = new Map()
let warnedAboutMissingKey = false

/**
 * Memos 地图页会把坐标直接写进 location.placeholder。这类值不是用户输入的地名，
 * 不应挡住逆地址解析。
 * @param {string | undefined} value
 */
export function isCoordinateLabel(value) {
  const text = (value || '').trim()
  if (!text) return true
  return /^[\[\]()（）\s]*[-+]?\d{1,3}(?:\.\d+)?\s*°?\s*[,，]\s*[-+]?\d{1,3}(?:\.\d+)?\s*°?[\]\s]*$/.test(text)
}

/** @param {number} latitude @param {number} longitude */
function coordinateKey(latitude, longitude) {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`
}

/** @param {any} result */
function locationLabel(result) {
  const candidates = [
    result?.formatted_addresses?.recommend,
    result?.formatted_addresses?.rough,
    result?.address,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return ''
}

/**
 * Memos stores GPS coordinates (WGS-84); Tencent's geocoder expects GCJ-02 in
 * mainland China. The SDK map already uses the same conversion.
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} key
 * @param {typeof fetch} fetcher
 */
async function requestLocationLabel(latitude, longitude, key, fetcher) {
  const [gcjLongitude, gcjLatitude] = wgs84ToGcj02(longitude, latitude)
  const params = new URLSearchParams({
    location: `${gcjLatitude.toFixed(6)},${gcjLongitude.toFixed(6)}`,
    key,
    get_poi: '0',
    output: 'json',
  })
  const response = await fetcher(`${ENDPOINT}?${params}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error(`Tencent geocoder returned HTTP ${response.status}`)
  const data = await response.json()
  if (data?.status !== 0) {
    const reason = data?.status === 110
      ? '错误码 110：来源域名未被授权。服务端请求没有浏览器来源信息，请检查 TMAP_SERVER_KEY 对应 WebService API 的域名白名单；浏览器地图 Key 的白名单保持不变。'
      : `Tencent geocoder returned status ${data?.status ?? 'unknown'}`
    throw new Error(reason)
  }
  return locationLabel(data.result)
}

/** @param {number} latitude @param {number} longitude @param {string} key @param {typeof fetch} fetcher */
async function cachedLocationLabel(latitude, longitude, key, fetcher) {
  const cacheKey = coordinateKey(latitude, longitude)
  const scope = `${key}:${cacheKey}`
  const cached = labelCache.get(scope)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  const failedUntil = failureCache.get(scope)
  if (failedUntil && failedUntil > Date.now()) return ''

  try {
    const value = await requestLocationLabel(latitude, longitude, key, fetcher)
    if (value) labelCache.set(scope, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    else failureCache.set(scope, Date.now() + FAILURE_TTL_MS)
    return value
  } catch (error) {
    // Address lookup is optional metadata: never fail a memo page because the map service is down.
    console.warn(`  ! 腾讯逆地址解析失败：${error instanceof Error ? error.message : String(error)}`)
    failureCache.set(scope, Date.now() + FAILURE_TTL_MS)
    return ''
  }
}

/** @param {any[]} items @param {number} limit @param {(item: any) => Promise<void>} worker */
async function forEachLimit(items, limit, worker) {
  let next = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next]
      next += 1
      await worker(item)
    }
  })
  await Promise.all(runners)
}

/**
 * Fill missing or coordinate-only memo location names with Chinese addresses from
 * Tencent's reverse geocoder. Existing user-authored place names are left untouched.
 * @param {import('./memos.mjs').SayMeta[]} says
 * @param {{ key?: string, fetcher?: typeof fetch }} [options]
 * @returns {Promise<import('./memos.mjs').SayMeta[]>}
 */
export async function enrichSayLocations(says, options = {}) {
  const key = (options.key || '').trim()
  const points = new Map()
  for (const say of says) {
    if (typeof say.latitude !== 'number' || typeof say.longitude !== 'number') continue
    if (!Number.isFinite(say.latitude) || !Number.isFinite(say.longitude)) continue
    if (!isCoordinateLabel(say.location)) continue
    points.set(coordinateKey(say.latitude, say.longitude), { latitude: say.latitude, longitude: say.longitude })
  }
  if (points.size === 0) return says
  if (!key) {
    if (!warnedAboutMissingKey) {
      console.warn('  ! 短记中文地址未解析：当前服务端未配置 TMAP_SERVER_KEY。请分别检查本地和部署环境的配置。')
      warnedAboutMissingKey = true
    }
    return says
  }

  const labels = new Map()
  const fetcher = options.fetcher || fetch
  await forEachLimit(Array.from(points.entries()), MAX_CONCURRENCY, async ([pointKey, point]) => {
    const label = await cachedLocationLabel(point.latitude, point.longitude, key, fetcher)
    if (label) labels.set(pointKey, label)
  })

  return says.map((say) => {
    if (typeof say.latitude !== 'number' || typeof say.longitude !== 'number') return say
    if (!isCoordinateLabel(say.location)) return say
    const label = labels.get(coordinateKey(say.latitude, say.longitude))
    return label ? { ...say, location: label } : say
  })
}
