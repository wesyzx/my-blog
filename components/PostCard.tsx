import Link from 'next/link'
import PostCover from '@/components/PostCover'
import type { PostMeta } from '@/lib/posts'
import { formatItemDate } from '@/lib/format'

export default function PostCard({ post }: { post: PostMeta; index?: number }) {
  const href = `/posts/${encodeURIComponent(post.slug)}`
  const dateLabel = formatItemDate(post.date)

  return (
    <article className="item post-item">
      {post.cover ? (
        <PostCover src={post.cover} title={post.title} date={post.date} href={href} />
      ) : (
        <>
          <time className="item-time" dateTime={post.date}>{dateLabel}</time>
          <h2 className="item-title"><Link href={href}>{post.title}</Link></h2>
        </>
      )}

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
