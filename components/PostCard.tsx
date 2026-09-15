import Image from 'next/image'
import Link from 'next/link'
import type { PostMeta } from '@/lib/posts'

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '日期待定'
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

export default function PostCard({ post }: { post: PostMeta }) {
  return (
    <article className={`post-row ${post.cover ? '' : 'without-cover'}`}>
      <div className="post-row-copy">
        <div className="post-meta"><Link href={`/?category=${encodeURIComponent(post.category)}`}>{post.category}</Link><span>·</span><time>{formatDate(post.date)}</time></div>
        <h2><Link href={`/posts/${encodeURIComponent(post.slug)}`}>{post.title}</Link></h2>
        {post.excerpt && <p>{post.excerpt}</p>}
        {post.tags.length > 0 && <div className="post-tags">{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
      </div>
      {post.cover && <Link href={`/posts/${encodeURIComponent(post.slug)}`} className="post-cover" tabIndex={-1} aria-hidden="true"><Image src={post.cover} alt="" fill sizes="(max-width: 640px) 96px, 190px" className="object-cover" /></Link>}
    </article>
  )
}
