import ArchiveHeatmap from '@/components/ArchiveHeatmap'
import ContentStream from '@/components/ContentStream'
import OrbitHero from '@/components/OrbitHero'
import { createPageMetadata } from '@/lib/metadata'
import { getAllSiteUpdates } from '@/lib/site-updates'

export const metadata = createPageMetadata({
  title: '轨道之外',
  description: '把日子写下来，等它们慢慢发光。这里有正在进行的事，也有已经走过的路。',
  path: '/',
})

export default function Home() {
  const updates = getAllSiteUpdates()
  const latest = updates.slice(0, 16)

  return (
    <div className="home-shell animate-fade-up">
      <div className="home-masthead">
        <OrbitHero />
        <ArchiveHeatmap updates={updates} variant="home" />
      </div>
      {latest.length > 0 ? (
        <ContentStream updates={latest} />
      ) : (
        <div className="empty-state">新的记录正在路上。</div>
      )}
    </div>
  )
}
