'use client'

import { useEffect, useState } from 'react'
import type { HeatmapNode, NormalizedActivity, WorkoutsDataContract } from '@/lib/workouts'
import WorkoutMap from '@/components/WorkoutMap'

// This is a public, read-only snapshot endpoint. Keeping the browser fallback
// independent from EdgeOne's server network makes the page resilient when the
// two providers cannot reach each other directly.
const WORKOUTS_SNAPSHOT_URL = 'https://workouts.wesyzx.workers.dev/v1/workouts.json'

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatPace(secondsPerKm?: number) {
  if (!secondsPerKm) return '—'
  const m = Math.floor(secondsPerKm / 60)
  const s = Math.floor(secondsPerKm % 60)
  return `${m}'${s.toString().padStart(2, '0')}"`
}

function formatDate(isoStr: string) {
  const date = new Date(isoStr)
  if (Number.isNaN(date.getTime())) return '时间待定'
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function daysInYear(year: number) {
  const days: string[] = []
  const current = new Date(Date.UTC(year, 0, 1))
  while (current.getUTCFullYear() === year) {
    days.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return days
}

function Heatmap({ data, year }: { data: HeatmapNode[]; year: number }) {
  const entries = new Map(data.filter((item) => item.date.startsWith(`${year}-`)).map((item) => [item.date, item]))
  const days = daysInYear(year)
  const leadingEmptyCells = new Date(Date.UTC(year, 0, 1)).getUTCDay()
  const activeDays = days.filter((date) => (entries.get(date)?.activityCount ?? 0) > 0).length

  return (
    <section className="workout-section" aria-labelledby="workout-heatmap-title">
      <div className="workout-section-heading">
        <h2 id="workout-heatmap-title">YEAR IN MOTION / 年度热力图</h2>
        <span>{activeDays} ACTIVE DAYS</span>
      </div>
      <div className="workout-heatmap-scroll" role="img" aria-label={`${year} 年共有 ${activeDays} 个运动日`}>
        <div className="workout-heatmap-grid" aria-hidden="true">
          {Array.from({ length: leadingEmptyCells }, (_, index) => <span key={`empty-${index}`} className="is-empty" />)}
          {days.map((date) => {
            const entry = entries.get(date)
            const count = entry?.activityCount ?? 0
            const level = count >= 3 ? 3 : count
            return <span key={date} className={`level-${level}`} title={`${date} · ${count} 次`} />
          })}
        </div>
      </div>
    </section>
  )
}

function hasData(data: WorkoutsDataContract) {
  return data.activities.length > 0 || data.heatmap.length > 0 || Object.keys(data.summary).length > 0
}

export default function WorkoutLiveContent({ initialData }: { initialData: WorkoutsDataContract }) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(!hasData(initialData))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch(WORKOUTS_SNAPSHOT_URL, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<WorkoutsDataContract>
      })
      .then((nextData) => {
        if (nextData?.schemaVersion !== 1) throw new Error('数据格式不兼容')
        setData(nextData)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError('暂时无法读取运动数据，请稍后刷新。')
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [])

  const years = Object.keys(data.summary).sort((left, right) => Number(right) - Number(left))
  const latestYear = years[0] ?? data.activities[0]?.startedAt.slice(0, 4)
  const summary = latestYear ? data.summary[latestYear] : null
  const recentActivities = data.activities.slice(0, 10)
  const latestActivityWithRoute = data.activities.find((activity) => activity.route)

  if (loading && !hasData(data)) return <div className="empty-state">正在读取运动数据…</div>
  if (error && !hasData(data)) return <div className="empty-state">{error}</div>
  if (!hasData(data)) return <div className="empty-state">运动数据接口已接入，等待首条运动记录。</div>

  return (
    <div className="workouts-content">
      {summary && (
        <section className="workout-stats" aria-label={`${summary.year} 年运动汇总`}>
          <div><span>YEAR</span><strong>{summary.year}</strong></div>
          <div><span>DISTANCE</span><strong>{(summary.totalDistanceMeters / 1000).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} <small>km</small></strong></div>
          <div><span>ACTIVITIES</span><strong>{summary.totalActivities}</strong></div>
          <div><span>TIME</span><strong>{Math.floor(summary.totalDurationSeconds / 3600)} <small>h</small></strong></div>
          <div><span>ELEVATION</span><strong>{summary.totalElevationGainMeters.toLocaleString('zh-CN')} <small>m</small></strong></div>
        </section>
      )}

      {latestYear && <Heatmap data={data.heatmap} year={Number(latestYear)} />}

      {latestActivityWithRoute?.route && (
        <section className="workout-section" aria-labelledby="latest-route-title">
          <div className="workout-section-heading">
            <h2 id="latest-route-title">LATEST ROUTE / 最近路线</h2>
            <span>{latestActivityWithRoute.type} · {(latestActivityWithRoute.distanceMeters / 1000).toFixed(2)} KM</span>
          </div>
          <WorkoutMap route={latestActivityWithRoute.route} className="workout-map" />
        </section>
      )}

      {recentActivities.length > 0 && (
        <section className="workout-section" aria-labelledby="recent-activities-title">
          <div className="workout-section-heading">
            <h2 id="recent-activities-title">RECENT ACTIVITIES / 最近运动</h2>
            <span>{recentActivities.length} RECORDS</span>
          </div>
          <div className="workout-rows">
            {recentActivities.map((activity: NormalizedActivity) => (
              <article key={activity.id} className="workout-row">
                <div className="workout-row-title">
                  <strong>{activity.type}</strong>
                  <time dateTime={activity.startedAt}>{formatDate(activity.startedAt)}</time>
                </div>
                <dl>
                  <div><dt>距离</dt><dd>{(activity.distanceMeters / 1000).toFixed(2)} km</dd></div>
                  <div className="workout-duration"><dt>时间</dt><dd>{formatDuration(activity.durationSeconds)}</dd></div>
                  <div><dt>配速</dt><dd>{formatPace(activity.pace)}</dd></div>
                  {activity.activeEnergyKcal !== undefined && <div><dt>消耗</dt><dd>{Math.round(activity.activeEnergyKcal)} kcal</dd></div>}
                  {activity.averageHeartRateBpm !== undefined && <div><dt>平均心率</dt><dd>{Math.round(activity.averageHeartRateBpm)} bpm</dd></div>}
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
