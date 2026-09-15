import Image from 'next/image'
import Link from 'next/link'
import type { FoodMeta } from '@/lib/food'
import Icon from './Icon'

export default function FoodCard({ post }: { post: FoodMeta }) {
  return <Link href={`/food/${encodeURIComponent(post.slug)}`} className="food-card">
    <div className="food-cover">{post.cover ? <Image src={post.cover} alt={post.title} fill sizes="(max-width: 760px) 50vw, 33vw" /> : <div className="image-placeholder"><Icon name="food" /></div>}{post.images.length > 0 && <span>{post.images.length} 张</span>}</div>
    <h3>{post.title}</h3><p><Icon name="location" />{post.address || post.location}</p>
  </Link>
}
