import Image from 'next/image'
import Link from 'next/link'
import type { PostMeta } from '@/lib/posts'

function formatEditorialDate(dateStr: string) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr || '—'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

function formatFullDate(dateStr: string) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '日期待定'
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export default function PostCard({ post, index }: { post: PostMeta; index?: number }) {
  const hasCover = Boolean(post.cover)
  const numStr = typeof index === 'number' ? String(index + 1).padStart(2, '0') : null

  return (
    <article className={`post-row ${hasCover ? 'has-cover' : 'no-cover'}`}>
      {numStr && (
        <span className="post-num editorial-meta" aria-hidden="true">
          {numStr}
        </span>
      )}

      <div className="post-row-content">
        <div className="post-row-header">
          <h2 className="post-row-title">
            <Link href={`/posts/${encodeURIComponent(post.slug)}`}>
              {post.title}
            </Link>
          </h2>

          <div className="post-row-meta">
            <Link
              href={`/?category=${encodeURIComponent(post.category)}`}
              className="post-category"
            >
              {post.category}
            </Link>
            <span className="post-meta-sep" aria-hidden="true">/</span>
            <time
              className="post-date"
              dateTime={post.date}
              title={formatFullDate(post.date)}
            >
              {formatEditorialDate(post.date)}
            </time>
          </div>
        </div>

        {post.excerpt && <p className="post-excerpt">{post.excerpt}</p>}

        {post.tags.length > 0 && (
          <div className="post-tags" aria-label="文章标签">
            {post.tags.map((tag) => (
              <span key={tag} className="post-tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {post.cover && (
        <Link
          href={`/posts/${encodeURIComponent(post.slug)}`}
          className="post-cover"
          tabIndex={-1}
          aria-hidden="true"
        >
          <Image
            src={post.cover}
            alt=""
            fill
            sizes="(max-width: 640px) 72px, 120px"
            className="object-cover"
          />
        </Link>
      )}
    </article>
  )
}
