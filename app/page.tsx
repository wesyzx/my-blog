import Image from 'next/image'
import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'
import { getAllFoodPosts } from '@/lib/food'
import { getAllGalleryItems, type GalleryMeta } from '@/lib/gallery'
import { getAllSays } from '@/lib/say'
import { formatItemDate } from '@/lib/format'
import GalleryMoment from '@/components/GalleryMoment'
import { createPageMetadata } from '@/lib/metadata'

interface SiteUpdate {
  id: string
  kind: 'post' | 'say' | 'gallery' | 'food'
  title: string
  detail?: string
  cover?: string
  date: string
  href: string
  album?: GalleryMeta
}

export const metadata = createPageMetadata({
  title: '轨道之外',
  description: '把日子写下来，等它们慢慢发光。这里有正在进行的事，也有已经走过的路。',
  path: '/',
})

// 首页是一条实时内容流。禁用页面缓存后，Notion 与 Memos 的更新不会被旧页面长期遮住。
export const dynamic = 'force-dynamic'

function dateValue(value: string) {
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function sayTitle(content: string) {
  const plain = content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return '一则短记'
  return plain.length > 54 ? `${plain.slice(0, 54)}…` : plain
}

function StreamItem({ update }: { update: SiteUpdate }) {
  if (update.kind === 'gallery' && update.album) {
    return <GalleryMoment album={update.album} />
  }

  if (update.cover) {
    return (
      <article className="item item-cover stream-item">
        <Link href={update.href} className="item-cover_link">
          <span className="item-cover_image">
            <Image
              src={update.cover}
              alt=""
              fill
              sizes="(max-width: 860px) 100vw, 680px"
              className="object-cover"
            />
          </span>
          <span className="item-cover_inner">
            <time className="item-time" dateTime={update.date}>{formatItemDate(update.date)}</time>
            <h2 className="item-title">{update.title}</h2>
          </span>
        </Link>
      </article>
    )
  }

  return (
    <article className="item stream-item">
      <time className="item-time" dateTime={update.date}>{formatItemDate(update.date)}</time>
      <h2 className="item-title"><Link href={update.href}>{update.title}</Link></h2>
      {update.detail && <p className="item-subtitle">{update.detail}</p>}
      <div className="item-tags"><span className="item-label">{update.kind === 'say' ? '短记' : '文章'}</span></div>
    </article>
  )
}

export default async function Home() {
  const posts = getAllPosts()
  const gallery = getAllGalleryItems()
  const [food, says] = await Promise.all([getAllFoodPosts(), getAllSays()])

  const updates: SiteUpdate[] = [
    ...posts.map((post): SiteUpdate => ({
      id: `post-${post.slug}`,
      kind: 'post',
      title: post.title,
      detail: post.excerpt || post.category,
      cover: post.cover || undefined,
      date: post.date,
      href: `/posts/${encodeURIComponent(post.slug)}`,
    })),
    ...says.map((say): SiteUpdate => ({
      id: `say-${say.slug}`,
      kind: 'say',
      title: sayTitle(say.content),
      cover: say.images?.[0] || say.image,
      date: say.date,
      href: `/say#say-${encodeURIComponent(say.slug)}`,
    })),
    ...gallery.map((album): SiteUpdate => ({
      id: `gallery-${album.slug}`,
      kind: 'gallery',
      title: album.title,
      date: album.date,
      href: `/gallery/${encodeURIComponent(album.slug)}`,
      album,
    })),
    ...food.map((place): SiteUpdate => ({
      id: `food-${place.slug}`,
      kind: 'food',
      title: place.title,
      detail: place.address || place.location,
      cover: place.cover || undefined,
      date: place.date,
      href: `/food/${encodeURIComponent(place.slug)}`,
    })),
  ].sort((a, b) => dateValue(b.date) - dateValue(a.date))

  return (
    <div className="home-shell animate-fade-up">
      <h1 className="sr-only">轨道之外的最近更新</h1>
      {updates.length > 0 ? (
        <section className="home-stream" aria-label="最近更新">
          {updates.slice(0, 16).map((update) => <StreamItem update={update} key={update.id} />)}
        </section>
      ) : (
        <div className="empty-state">这里还没有内容。</div>
      )}
    </div>
  )
}
