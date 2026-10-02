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

const ACTIVITY_LABELS: Record<NormalizedActivity['type'], string> = {
  Run: '跑步',
  Ride: '骑行',
  Swim: '游泳',
  Hike: '徒步',
  Walk: '步行',
  Stairs: '爬楼',
  Workout: '训练',
}

function activityLabel(type: NormalizedActivity['type']) {
  return ACTIVITY_LABELS[type] ?? type
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

function Heatmap({ data, year, lastUpdated }: { data: HeatmapNode[]; year: number; lastUpdated: string }) {
  const entries = new Map(data.filter((item) => item.date.startsWith(`${year}-`)).map((item) => [item.date, item]))
  const days = daysInYear(year)
  const leadingEmptyCells = new Date(Date.UTC(year, 0, 1)).getUTCDay()
  const trailingEmptyCells = (7 - ((leadingEmptyCells + days.length) % 7)) % 7
  const weekCount = (leadingEmptyCells + days.length + trailingEmptyCells) / 7
  const activeDays = days.filter((date) => (entries.get(date)?.activityCount ?? 0) > 0).length
  // 用快照时间而不是浏览器当前时间，避免服务端与客户端渲染结果不一致。
  const todayKey = /^\d{4}-\d{2}-\d{2}/.test(lastUpdated) ? lastUpdated.slice(0, 10) : ''

  const monthLabels = days.reduce<Array<{ label: string; column: number }>>((labels, date, index) => {
    if (date.slice(8, 10) !== '01') return labels
    const column = Math.floor((leadingEmptyCells + index) / 7) + 1
    if (column <= weekCount - 1 && !labels.some((item) => item.column === column)) {
      labels.push({
        label: new Intl.DateTimeFormat('zh-CN', { month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)),
        column,
      })
    }
    return labels
  }, [])

  return (
    <section className="workout-section" aria-labelledby="workout-heatmap-title">
      <div className="workout-section-heading">
        <h2 id="workout-heatmap-title">{year} 年度足迹</h2>
        <span>{activeDays} 个运动日</span>
      </div>
      <div className="workout-heatmap-scroll">
        <div className="workout-heatmap-chart" style={{ minWidth: `${weekCount * 12 - 3}px` }}>
          <div className="workout-heatmap-months" style={{ gridTemplateColumns: `repeat(${weekCount}, 9px)` }} aria-hidden="true">
            {monthLabels.map((month) => (
              <span key={`${month.label}-${month.column}`} style={{ gridColumnStart: month.column }}>{month.label}</span>
            ))}
          </div>
          <div className="workout-heatmap-grid" role="img" aria-label={`${year} 年共有 ${activeDays} 个运动日`}>
            {Array.from({ length: leadingEmptyCells }, (_, index) => <span key={`lead-${index}`} className="is-empty" />)}
            {days.map((date) => {
              const count = entries.get(date)?.activityCount ?? 0
              const level = count >= 3 ? 3 : count
              const isFuture = Boolean(todayKey) && date > todayKey
              return (
                <span
                  key={date}
                  className={`level-${isFuture ? 0 : level}${isFuture ? ' is-future' : ''}`}
                  title={isFuture ? undefined : `${date} · ${count} 次`}
                  aria-hidden="true"
                />
              )
            })}
            {Array.from({ length: trailingEmptyCells }, (_, index) => <span key={`trail-${index}`} className="is-empty" />)}
          </div>
        </div>
      </div>
      <footer className="workout-heatmap-footer">
        <span>{year} 年 1 月 1 日 — 12 月 31 日</span>
        <span className="workout-heatmap-legend" aria-label="颜色越深，当天运动越多">
          少
          {[0, 1, 2, 3].map((level) => <i key={level} className={`level-${level}`} />)}
          多
        </span>
      </footer>
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
  if (!hasData(data)) return <div className="empty-state">新的运动记录正在路上。</div>

  return (
    <div className="workouts-content">
      {summary && (
        <section className="workout-stats" aria-label={`${summary.year} 年运动汇总`}>
          <div><span>年份</span><strong>{summary.year}</strong></div>
          <div><span>距离</span><strong>{(summary.totalDistanceMeters / 1000).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} <small>km</small></strong></div>
          <div><span>运动</span><strong>{summary.totalActivities} <small>次</small></strong></div>
          <div><span>时长</span><strong>{Math.floor(summary.totalDurationSeconds / 3600)} <small>小时</small></strong></div>
          <div><span>爬升</span><strong>{summary.totalElevationGainMeters.toLocaleString('zh-CN')} <small>m</small></strong></div>
        </section>
      )}

      {latestYear && <Heatmap data={data.heatmap} year={Number(latestYear)} lastUpdated={data.lastUpdated} />}

      {latestActivityWithRoute?.route && (
        <section className="workout-section" aria-labelledby="latest-route-title">
          <div className="workout-section-heading">
            <h2 id="latest-route-title">最近路线</h2>
            <span>{activityLabel(latestActivityWithRoute.type)} · {(latestActivityWithRoute.distanceMeters / 1000).toFixed(2)} km</span>
          </div>
          <WorkoutMap route={latestActivityWithRoute.route} className="workout-map" />
        </section>
      )}

      {recentActivities.length > 0 && (
        <section className="workout-section" aria-labelledby="recent-activities-title">
          <div className="workout-section-heading">
            <h2 id="recent-activities-title">最近运动</h2>
            <span>{recentActivities.length} 条记录</span>
          </div>
          <div className="workout-rows">
            {recentActivities.map((activity: NormalizedActivity) => (
              <article key={activity.id} className="workout-row">
                <div className="workout-row-title">
                  <strong>{activityLabel(activity.type)}</strong>
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
