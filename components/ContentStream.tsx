import Image from 'next/image'
import Link from 'next/link'
import GalleryMoment from '@/components/GalleryMoment'
import { formatItemDate } from '@/lib/format'
import type { SiteUpdate } from '@/lib/site-updates'

const LABELS: Record<SiteUpdate['kind'], string> = {
  post: '博文',
  say: '短记',
  gallery: '相册',
  food: '美食',
}

type HeadingLevel = 'h2' | 'h3' | 'h4'

function StreamItem({ update, headingLevel }: { update: SiteUpdate; headingLevel: HeadingLevel }) {
  const Heading = headingLevel

  if (update.kind === 'gallery' && update.album) {
    return <GalleryMoment album={update.album} headingLevel={headingLevel} />
  }

  if (update.kind === 'post' && update.cover) {
    return (
      <article className="item item-cover stream-item stream-post">
        <Link href={update.href} className="item-cover_link">
          <span className="item-cover_image">
            <Image src={update.cover} alt="" fill sizes="(max-width: 860px) 100vw, 680px" />
          </span>
          <span className="item-cover_inner">
            <span className="stream-meta">
              <time className="item-time" dateTime={update.date}>{formatItemDate(update.date)}</time>
              <span>{LABELS[update.kind]}</span>
            </span>
            <Heading className="item-title">{update.title}</Heading>
          </span>
        </Link>
      </article>
    )
  }

  if (update.kind === 'food') {
    return (
      <article className="item stream-item stream-food">
        {update.cover && (
          <Link href={update.href} className="stream-food-image" aria-label={`查看美食记录：${update.title}`}>
            <Image src={update.cover} alt="" fill sizes="(max-width: 560px) 100vw, 260px" />
          </Link>
        )}
        <div className="stream-food-main">
          <span className="stream-meta">
            <time className="item-time" dateTime={update.date}>{formatItemDate(update.date)}</time>
            <span>{LABELS[update.kind]}</span>
          </span>
          <Heading className="item-title"><Link href={update.href}>{update.title}</Link></Heading>
          {update.detail && <p className="item-subtitle">{update.detail}</p>}
        </div>
      </article>
    )
  }

  if (update.kind === 'say') {
    return (
      <article className="item stream-item stream-note">
        <span className="stream-meta">
          <time className="item-time" dateTime={update.date}>{formatItemDate(update.date)}</time>
          <span>{LABELS[update.kind]}</span>
        </span>
        <Heading className="stream-note-title"><Link href={update.href}>{update.title}</Link></Heading>
        {update.cover && (
          <Link href={update.href} className="stream-note-image" aria-label="查看这则短记">
            <Image src={update.cover} alt="" fill sizes="(max-width: 860px) 100vw, 680px" />
          </Link>
        )}
      </article>
    )
  }

  return (
    <article className="item stream-item">
      <span className="stream-meta">
        <time className="item-time" dateTime={update.date}>{formatItemDate(update.date)}</time>
        <span>{LABELS[update.kind]}</span>
      </span>
      <Heading className="item-title"><Link href={update.href}>{update.title}</Link></Heading>
      {update.detail && <p className="item-subtitle">{update.detail}</p>}
    </article>
  )
}

export default function ContentStream({ updates, headingLevel = 'h2' }: { updates: SiteUpdate[]; headingLevel?: HeadingLevel }) {
  return <div className="home-stream">{updates.map((update) => <StreamItem update={update} headingLevel={headingLevel} key={update.id} />)}</div>
}
