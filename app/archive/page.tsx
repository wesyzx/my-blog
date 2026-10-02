import ContentStream from '@/components/ContentStream'
import ArchiveHeatmap from '@/components/ArchiveHeatmap'
import PageHeader from '@/components/PageHeader'
import { createPageMetadata } from '@/lib/metadata'
import { getAllSiteUpdates, type SiteUpdate } from '@/lib/site-updates'

export const metadata = createPageMetadata({
  title: '归档',
  description: '按年月收拢轨道之外留下的文章、短记、相册与美食记录。',
  path: '/archive',
})

export const dynamic = 'force-dynamic'

function dateParts(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { year: '更早', month: '日期待定' }
  return {
    year: String(date.getFullYear()),
    month: new Intl.DateTimeFormat('zh-CN', { month: 'long' }).format(date),
  }
}

function groupUpdates(updates: SiteUpdate[]) {
  const years = new Map<string, Map<string, SiteUpdate[]>>()
  for (const update of updates) {
    const { year, month } = dateParts(update.date)
    const months = years.get(year) ?? new Map<string, SiteUpdate[]>()
    const items = months.get(month) ?? []
    items.push(update)
    months.set(month, items)
    years.set(year, months)
  }
  return Array.from(years.entries())
}

export default async function ArchivePage() {
  const updates = await getAllSiteUpdates()
  const groups = groupUpdates(updates)

  return (
    <div className="home-shell archive-shell animate-fade-up">
      <PageHeader title="归档" />
      <ArchiveHeatmap updates={updates} />
      {groups.length > 0 ? groups.map(([year, months]) => (
        <section className="archive-year" aria-labelledby={`archive-${year}`} key={year}>
          <header className="archive-year-heading">
            <h2 id={`archive-${year}`}>{year}</h2>
            <span>{Array.from(months.values()).reduce((sum, items) => sum + items.length, 0)} 条记录</span>
          </header>
          {Array.from(months.entries()).map(([month, items]) => (
            <section className="archive-month" aria-labelledby={`archive-${year}-${month}`} key={`${year}-${month}`}>
              <div className="archive-month-heading">
                <h3 id={`archive-${year}-${month}`}>{month}</h3>
                <span>{items.length}</span>
              </div>
              <ContentStream updates={items} headingLevel="h4" />
            </section>
          ))}
        </section>
      )) : <div className="empty-state">新的记录正在路上。</div>}
    </div>
  )
}
