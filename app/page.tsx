import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'
import { getAllFoodPosts } from '@/lib/food'
import { getAllGalleryItems } from '@/lib/gallery'
import { getAllSays } from '@/lib/say'
import PublishingHeatmap, { type PublishingActivity } from '@/components/PublishingHeatmap'
import Icon from '@/components/Icon'
import { createPageMetadata } from '@/lib/metadata'

interface SiteUpdate extends PublishingActivity {
  id: string
  title: string
  detail?: string
  href: string
}

export const metadata = createPageMetadata({
  title: '轨道之外',
  description: '把日子写下来，等它们慢慢发光。这里有正在进行的事，也有已经走过的路。',
  path: '/',
})

// 首页汇总的是「此刻还剩下什么」，必须跟内容源一致。原先它是静态页，Next 给 ISR 页发的响应头是
// `s-maxage=60, stale-while-revalidate=31535940`（默认 expire 是一整年）——缓存过期后仍会先返回旧
// 内容、后台再刷新。于是博文清空、/posts 已经空了，首页却还在展示旧文章列表。
// 和 /say、/workouts 一样改成每次请求都重新渲染，响应头变成 no-store，CDN 不再缓存。
export const dynamic = 'force-dynamic'

function dateValue(value: string) {
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function formatEditorialDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '日期待定'
  return date.toISOString().slice(0, 10).replaceAll('-', '.')
}

function sayTitle(content: string) {
  const plain = content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return '一则短记'
  return plain.length > 34 ? `${plain.slice(0, 34)}…` : plain
}

export default async function Home() {
  const posts = getAllPosts()
  const gallery = getAllGalleryItems()
  const [food, says] = await Promise.all([getAllFoodPosts(), getAllSays()])

  const updates: SiteUpdate[] = [
    ...posts.map((post) => ({
      id: `post-${post.slug}`,
      type: '文章',
      title: post.title,
      detail: post.excerpt || post.category,
      date: post.date,
      href: `/posts/${encodeURIComponent(post.slug)}`,
    })),
    ...says.map((say) => ({
      id: `say-${say.slug}`,
      type: '短记',
      title: sayTitle(say.content),
      date: say.date,
      href: `/say#say-${encodeURIComponent(say.slug)}`,
    })),
    ...gallery.map((album) => ({
      id: `gallery-${album.slug}`,
      type: '相册',
      title: album.title,
      detail: album.excerpt || (album.images?.length ? `${album.images.length} 张照片` : ''),
      date: album.date,
      href: `/gallery/${encodeURIComponent(album.slug)}`,
    })),
    ...food.map((place) => ({
      id: `food-${place.slug}`,
      type: '美食',
      title: place.title,
      detail: place.address || place.location,
      date: place.date,
      href: `/food/${encodeURIComponent(place.slug)}`,
    })),
  ].sort((a, b) => dateValue(b.date) - dateValue(a.date))

  const facts = [
    { count: posts.length, label: '文章', href: '/posts' },
    { count: says.length, label: '短记', href: '/say' },
    { count: gallery.length, label: '相册', href: '/gallery' },
    { count: food.length, label: '美食', href: '/food' },
  ]

  const latest = updates.slice(0, 7)

  return (
    <div className="home-shell animate-fade-up">
      <section className="home-intro" aria-labelledby="home-title">
        <div className="home-intro-main">
          <p className="editorial-meta home-intro-eyebrow">CAN CHOU / 轨道之外</p>
          <h1 id="home-title" className="home-intro-title">把日子写下来，<br />等它们慢慢发光。</h1>
          <p className="home-lead">这里有正在进行的事，也有已经走过的路。愿你在其中找到一点共鸣。</p>
        </div>

        <div className="home-intro-aside">
          <div className="home-facts" aria-label="这里已经留下的内容">
            {facts.map((fact) => (
              <Link key={fact.href} href={fact.href} className="fact-item" aria-label={`${fact.label} ${fact.count}`}>
                <span className="fact-num">{fact.count}</span>
                <span className="fact-label">{fact.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <hr className="editorial-rule home-section-divider" />

      <PublishingHeatmap activities={updates} />

      <section className="latest-updates" aria-labelledby="latest-updates-title">
        <div className="latest-updates-header">
          <div>
            <p className="editorial-meta">LATEST</p>
            <h2 id="latest-updates-title" className="home-section-title">最近留下</h2>
            <p>从一篇文章到一顿饭，最近的片段都在这里。</p>
          </div>
          <span className="editorial-meta">最近 {latest.length} 条</span>
        </div>

        <div className="latest-update-list">
          {latest.map((update) => (
            <Link key={update.id} href={update.href} className="latest-update-row">
              <span className="latest-update-type">{update.type}</span>
              <span className="latest-update-body">
                <strong>{update.title}</strong>
                {update.detail ? <span className="latest-update-detail">{update.detail}</span> : null}
              </span>
              <time dateTime={update.date}>{formatEditorialDate(update.date)}</time>
              <Icon name="arrow-right" />
            </Link>
          ))}
        </div>

        <div className="latest-updates-more">
          <Link href="/posts">浏览全部文章 <Icon name="arrow-right" /></Link>
        </div>
      </section>
    </div>
  )
}
