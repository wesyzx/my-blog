import Image from 'next/image'
import Link from 'next/link'
import type { PostMeta } from '@/lib/posts'

/** ueno 的日期格式：Nov 13, 2025 */
function formatItemDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

/**
 * 列表条目 —— 对齐 ueno 的 .item
 *
 * 有封面时渲染成 .item-cover（全宽封面 + 深色蒙版 + 白字覆盖，悬停蒙版加深）；
 * 没有封面时退化成纯文字行（日期 / 标题 / 摘要 / 标签）。
 * 这是这套设计里最能拉开观感的一处：图片成为列表的主角。
 */
export default function PostCard({ post }: { post: PostMeta; index?: number }) {
  const href = `/posts/${encodeURIComponent(post.slug)}`
  const dateLabel = formatItemDate(post.date)

  if (post.cover) {
    return (
      <article className="item item-cover">
        <Link href={href} className="item-cover_link">
          <span className="item-cover_image">
            <Image
              src={post.cover}
              alt=""
              fill
              sizes="(max-width: 860px) 100vw, 680px"
              className="object-cover"
            />
          </span>
          <span className="item-cover_inner">
            <time className="item-time" dateTime={post.date}>{dateLabel}</time>
            <h3 className="item-title">{post.title}</h3>
          </span>
        </Link>
      </article>
    )
  }

  return (
    <article className="item">
      <time className="item-time" dateTime={post.date}>{dateLabel}</time>

      <h3 className="item-title">
        <Link href={href}>{post.title}</Link>
      </h3>

      {post.excerpt && <p className="item-subtitle">{post.excerpt}</p>}

      {post.tags.length > 0 && (
        <div className="item-tags" aria-label="文章标签">
          {post.tags.map((tag) => (
            <span key={tag} className="item-label">{tag}</span>
          ))}
        </div>
      )}
    </article>
  )
}
