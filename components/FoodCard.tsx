import BlogImage from '@/components/BlogImage'
import Link from 'next/link'
import type { FoodMeta } from '@/lib/food'
import Icon from './Icon'
import { formatItemDate } from '@/lib/format'

export default function FoodCard({ post }: { post: FoodMeta }) {
  return (
    <Link href={`/food/${encodeURIComponent(post.slug)}`} className="food-card">
      <div className="food-cover">
        {post.cover ? (
          <BlogImage preset="landscape" src={post.cover} alt={post.title} fill sizes="(max-width: 760px) 50vw, 33vw" />
        ) : (
          <div className="image-placeholder"><Icon name="food" /></div>
        )}
        {post.images.length > 0 && (
          <span className="cover-badge">{post.images.length} 张</span>
        )}
      </div>
      <time className="food-card-date" dateTime={post.date}>{formatItemDate(post.date)}</time>
      <h3>{post.title}</h3>
      {(post.address || post.location) && <p><Icon name="location" /><span>{post.address || post.location}</span></p>}
    </Link>
  )
}
