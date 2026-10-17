import Image from 'next/image'
import Link from 'next/link'
import ImageLightbox from '@/components/ImageLightbox'
import { formatItemDate } from '@/lib/format'

export default function PostCover({
  src,
  title,
  date,
  href,
  label,
  headingLevel = 'h2',
}: {
  src: string
  title: string
  date: string
  href: string
  label?: string
  headingLevel?: 'h2' | 'h3' | 'h4'
}) {
  const Heading = headingLevel

  return (
    <ImageLightbox className="post-cover" triggerSelector=".post-cover-expand">
      <Link href={href} className="post-cover-media" aria-label={`阅读博文：${title}`}>
        <Image
          src={src}
          alt={title}
          fill
          sizes="(max-width: 720px) calc(100vw - 32px), 680px"
          unoptimized={process.env.NODE_ENV === 'development'}
          data-lightbox-src={src}
        />
      </Link>
      <button type="button" className="post-cover-expand" aria-label={`放大图片：${title}`} aria-haspopup="dialog">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
        </svg>
      </button>
      <div className="post-cover-copy">
        <div className="post-cover-meta">
          <time dateTime={date}>{formatItemDate(date)}</time>
          {label && <span>{label}</span>}
        </div>
        <Heading className="post-cover-title"><Link href={href}>{title}</Link></Heading>
      </div>
    </ImageLightbox>
  )
}
