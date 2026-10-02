import type { SiteUpdate } from '@/lib/site-updates'

const DAY_MS = 24 * 60 * 60 * 1000

const KIND_LABELS: Record<SiteUpdate['kind'], string> = {
  post: '博文',
  say: '短记',
  gallery: '相册',
  food: '美食',
}

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

export default function ArchiveHeatmap({ updates }: { updates: SiteUpdate[] }) {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const rangeStart = new Date(today.getTime() - 364 * DAY_MS)
  const gridStart = new Date(rangeStart)
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay())

  const gridEnd = new Date(today)
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - gridEnd.getUTCDay()))

  const counts = new Map<string, { count: number; kinds: Set<SiteUpdate['kind']> }>()
  for (const update of updates) {
    const key = dateKey(update.date)
    if (!key) continue
    const current = counts.get(key) ?? { count: 0, kinds: new Set<SiteUpdate['kind']>() }
    current.count += 1
    current.kinds.add(update.kind)
    counts.set(key, current)
  }

  const days: Date[] = []
  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = new Date(cursor.getTime() + DAY_MS)) {
    days.push(cursor)
  }

  const weekCount = Math.ceil(days.length / 7)
  const monthLabels = days.reduce<Array<{ label: string; column: number }>>((labels, day, index) => {
    if (day.getUTCDate() !== 1) return labels
    const column = Math.floor(index / 7) + 1
    if (column <= weekCount - 2 && !labels.some((item) => item.column === column)) {
      labels.push({
        label: new Intl.DateTimeFormat('zh-CN', { month: 'short', timeZone: 'UTC' }).format(day),
        column,
      })
    }
    return labels
  }, [])

  const visibleStart = formatDate(rangeStart)
  const visibleEnd = formatDate(today)
  const visibleUpdates = updates.filter((update) => {
    const key = dateKey(update.date)
    return key >= visibleStart && key <= visibleEnd
  })
  const activeDays = new Set(visibleUpdates.map((update) => dateKey(update.date)).filter(Boolean)).size

  return (
    <section className="archive-activity" aria-labelledby="archive-activity-title">
      <header className="archive-activity-heading">
        <div>
          <p className="editorial-meta">PAST 365 DAYS</p>
          <h2 id="archive-activity-title">这一年</h2>
        </div>
        <p>{activeDays} 个记录日 · {visibleUpdates.length} 次更新</p>
      </header>

      <div className="archive-activity-scroll">
        <div className="archive-activity-chart" style={{ minWidth: `${weekCount * 12 - 3}px` }}>
          <div className="archive-activity-months" style={{ gridTemplateColumns: `repeat(${weekCount}, 9px)` }} aria-hidden="true">
            {monthLabels.map((month) => (
              <span key={`${month.label}-${month.column}`} style={{ gridColumnStart: month.column }}>
                {month.label}
              </span>
            ))}
          </div>
          <div className="archive-activity-grid" role="img" aria-label={`过去一年共有 ${activeDays} 个记录日，更新 ${visibleUpdates.length} 次`}>
            {days.map((day) => {
              const key = formatDate(day)
              const activity = counts.get(key)
              const isOutsideRange = day < rangeStart || day > today
              const count = isOutsideRange ? 0 : activity?.count ?? 0
              const kinds = activity ? Array.from(activity.kinds).map((kind) => KIND_LABELS[kind]).join('、') : ''
              const title = count > 0 ? `${key} · ${count} 次更新（${kinds}）` : `${key} · 没有记录`

              return (
                <span
                  key={key}
                  className={`archive-activity-day level-${levelFor(count)}${isOutsideRange ? ' is-outside' : ''}`}
                  title={isOutsideRange ? undefined : title}
                  aria-hidden="true"
                />
              )
            })}
          </div>
        </div>
      </div>

      <footer className="archive-activity-footer">
        <span>过去 365 天</span>
        <span className="archive-activity-legend" aria-label="颜色越深，当天更新越多">
          少
          {[0, 1, 2, 3].map((level) => <i key={level} className={`archive-activity-day level-${level}`} />)}
          多
        </span>
      </footer>
    </section>
  )
}
