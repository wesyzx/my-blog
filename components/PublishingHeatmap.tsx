export interface PublishingActivity {
  date: string
  type: string
}

const DAY_MS = 24 * 60 * 60 * 1000

function dateKey(value: string) {
  const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoDate) return isoDate[1]

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function levelFor(count: number) {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  return 3
}

export default function PublishingHeatmap({ activities }: { activities: PublishingActivity[] }) {
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const start = new Date(todayUtc.getTime() - 364 * DAY_MS)
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())

  const end = new Date(todayUtc)
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()))

  const counts = new Map<string, { count: number; types: Set<string> }>()
  activities.forEach((activity) => {
    const key = dateKey(activity.date)
    if (!key) return
    const current = counts.get(key) ?? { count: 0, types: new Set<string>() }
    current.count += 1
    current.types.add(activity.type)
    counts.set(key, current)
  })

  const days: Date[] = []
  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + DAY_MS)) {
    days.push(cursor)
  }

  const weekCount = Math.ceil(days.length / 7)
  const monthLabels = days.reduce<Array<{ label: string; column: number }>>((labels, day, index) => {
    if (index === 0 || day.getUTCDate() === 1) {
      const column = Math.floor(index / 7) + 1
      if (column <= weekCount - 2 && !labels.some((item) => item.column === column)) {
        labels.push({
          label: new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(day).toUpperCase(),
          column,
        })
      }
    }
    return labels
  }, [])

  const visibleStart = formatDate(start)
  const visibleEnd = formatDate(todayUtc)
  const visibleTotal = activities.filter((activity) => {
    const key = dateKey(activity.date)
    return key >= visibleStart && key <= visibleEnd
  }).length

  return (
    <section className="publishing-panel" aria-labelledby="publishing-title">
      <div className="publishing-header">
        <div>
          <p className="editorial-meta">MOMENTS</p>
          <h2 id="publishing-title" className="home-section-title">内容足迹</h2>
          <p className="publishing-description">过去一年，日子在这里留下了 {visibleTotal} 个片段。</p>
        </div>
      </div>

      <div className="publishing-heatmap-scroll">
        <div className="publishing-heatmap" style={{ minWidth: `${weekCount * 12 - 3}px` }}>
          <div className="publishing-months" style={{ gridTemplateColumns: `repeat(${weekCount}, 9px)` }} aria-hidden="true">
            {monthLabels.map((month) => (
              <span key={`${month.label}-${month.column}`} style={{ gridColumnStart: month.column }}>
                {month.label}
              </span>
            ))}
          </div>
          <div className="publishing-grid" role="img" aria-label={`近一年共留下 ${visibleTotal} 个片段`}>
            {days.map((day) => {
              const key = formatDate(day)
              const activity = counts.get(key)
              const isFuture = day > todayUtc
              const count = isFuture ? 0 : activity?.count ?? 0
              const types = activity ? Array.from(activity.types).join('、') : ''
              const title = isFuture ? '' : count > 0 ? `${key} · ${count} 个片段（${types}）` : `${key} · 这一天还没有内容`

              return (
                <span
                  key={key}
                  className={`publishing-day level-${levelFor(count)}${isFuture ? ' is-future' : ''}`}
                  title={title || undefined}
                  aria-hidden="true"
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className="publishing-footer">
        <span>近一年</span>
        <span className="publishing-legend" aria-label="颜色越深，这一天留下的内容越多">
          少
          {[0, 1, 2, 3].map((level) => <i key={level} className={`publishing-day level-${level}`} />)}
          多
        </span>
      </div>
    </section>
  )
}
