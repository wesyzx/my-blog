import Link from 'next/link'
import ContentStream from '@/components/ContentStream'
import Icon from '@/components/Icon'
import { createPageMetadata } from '@/lib/metadata'
import { getAllSiteUpdates } from '@/lib/site-updates'

export const metadata = createPageMetadata({
  title: '轨道之外',
  description: '把日子写下来，等它们慢慢发光。这里有正在进行的事，也有已经走过的路。',
  path: '/',
})

// 首页是一条实时内容流。禁用页面缓存后，Notion 与 Memos 的更新不会被旧页面长期遮住。
export const dynamic = 'force-dynamic'

export default async function Home() {
  const updates = await getAllSiteUpdates()
  const latest = updates.slice(0, 16)

  return (
    <div className="home-shell animate-fade-up">
      <h1 className="sr-only">轨道之外的最近更新</h1>
      {latest.length > 0 ? (
        <>
          <ContentStream updates={latest} />
          <div className="stream-more">
            <Link href="/archive">浏览全部归档 <Icon name="arrow-right" /></Link>
          </div>
        </>
      ) : (
        <div className="empty-state">新的记录正在路上。</div>
      )}
    </div>
  )
}
