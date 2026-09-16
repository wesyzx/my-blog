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
  href: string
}

export const metadata = createPageMetadata({
  title: '轨道之外',
  description: '慢慢记录，用心感受。这里收集关于技术、生活、美食与旅途的片段。',
  path: '/',
})

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
  if (!plain) return '一则说说'
  return plain.length > 34 ? `${plain.slice(0, 34)}…` : plain
}

export default async function Home() {
  const posts = getAllPosts()
  const gallery = getAllGalleryItems()
  const [food, says] = await Promise.all([getAllFoodPosts(), getAllSays()])

  const updates: SiteUpdate[] = [
    ...posts.map((post) => ({
      id: `post-${post.slug}`,
      type: '博文',
      title: post.title,
      date: post.date,
      href: `/posts/${encodeURIComponent(post.slug)}`,
    })),
    ...says.map((say) => ({
      id: `say-${say.slug}`,
      type: '说说',
      title: sayTitle(say.content),
      date: say.date,
      href: `/say#say-${encodeURIComponent(say.slug)}`,
    })),
    ...gallery.map((album) => ({
      id: `gallery-${album.slug}`,
      type: '相册',
      title: album.title,
      date: album.date,
      href: `/gallery/${encodeURIComponent(album.slug)}`,
    })),
    ...food.map((place) => ({
      id: `food-${place.slug}`,
      type: '地点',
      title: place.title,
      date: place.date,
      href: `/food/${encodeURIComponent(place.slug)}`,
    })),
  ].sort((a, b) => dateValue(b.date) - dateValue(a.date))

  const facts = [
    { count: posts.length, label: 'WRITING', href: '/posts' },
    { count: says.length, label: 'NOTES', href: '/say' },
    { count: gallery.length, label: 'GALLERY', href: '/gallery' },
    { count: food.length, label: 'PLACES', href: '/food' },
  ]

  return (
    <div className="home-shell animate-fade-up">
      <section className="home-intro" aria-labelledby="home-title">
        <div className="home-intro-main">
          <p className="editorial-meta home-intro-eyebrow">CAN CHOU / 轨道之外</p>
          <h1 id="home-title" className="home-intro-title">慢慢记录，<br />用心感受。</h1>
          <p className="home-lead">这里收集我的技术折腾、生活日常、美食探访和旅途片段。首页看近况，博文页读完整目录。</p>
        </div>

        <div className="home-intro-aside">
          <div className="home-facts" aria-label="博客内容统计">
            {facts.map((fact) => (
              <Link key={fact.href} href={fact.href} className="fact-item" aria-label={`${fact.label} ${fact.count}`}>
                <span className="fact-num">{fact.count}</span>
                <span className="fact-label editorial-meta">{fact.label}</span>
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
            <p id="latest-updates-title" className="editorial-meta">LATEST UPDATES / 最近更新</p>
            <p>不分栏目，按时间收拢最近留下的内容。</p>
          </div>
          <span className="editorial-meta">{updates.length} ENTRIES</span>
        </div>

        <div className="latest-update-list">
          {updates.slice(0, 7).map((update) => (
            <Link key={update.id} href={update.href} className="latest-update-row">
              <span className="latest-update-type">{update.type}</span>
              <strong>{update.title}</strong>
              <time dateTime={update.date}>{formatEditorialDate(update.date)}</time>
              <Icon name="arrow-right" />
            </Link>
          ))}
        </div>

        <div className="latest-updates-more">
          <Link href="/posts">浏览全部博文 <Icon name="arrow-right" /></Link>
        </div>
      </section>
    </div>
  )
}
