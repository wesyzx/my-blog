import Link from 'next/link'
import ContentImage from '@/components/ContentImage'
import GalleryMoment from '@/components/GalleryMoment'
import PostCover from '@/components/PostCover'
import { formatItemDate } from '@/lib/format'
import type { SiteUpdate } from '@/lib/site-updates'

const LABELS: Record<SiteUpdate['kind'], string> = {
  post: '博文',
  gallery: '相册',
  food: '美食',
}

type HeadingLevel = 'h2' | 'h3' | 'h4'

function StreamItem({ update, headingLevel, sizes }: { update: SiteUpdate; headingLevel: HeadingLevel; sizes?: string }) {
  const Heading = headingLevel

  if (update.kind === 'gallery' && update.album) {
    return <GalleryMoment album={update.album} headingLevel={headingLevel} />
  }

  if (update.kind === 'post' && update.cover) {
    return (
      <article className="item stream-item stream-post">
        <PostCover
          src={update.cover}
          title={update.title}
          date={update.date}
          href={update.href}
          label={LABELS.post}
          headingLevel={headingLevel}
          sizes={sizes}
        />
        {update.detail && <p className="item-subtitle">{update.detail}</p>}
      </article>
    )
  }

  return (
    <article className={`item stream-item stream-${update.kind}`}>
      <span className="stream-meta">
        <time className="item-time" dateTime={update.date}>{formatItemDate(update.date)}</time>
        <span>{LABELS[update.kind]}</span>
      </span>
      <Heading className="item-title">
        <Link href={update.href}>{update.title}</Link>
      </Heading>
      {update.detail && <p className="item-subtitle">{update.detail}</p>}
      {update.cover && (
        <ContentImage src={update.cover} alt={update.title} fit={update.kind === 'food' ? 'cover' : 'contain'} sizes={sizes} />
      )}
    </article>
  )
}

export default function ContentStream({ updates, headingLevel = 'h2', sizes }: { updates: SiteUpdate[]; headingLevel?: HeadingLevel; sizes?: string }) {
  return <div className="home-stream">{updates.map((update) => <StreamItem update={update} headingLevel={headingLevel} sizes={sizes} key={update.id} />)}</div>
}
