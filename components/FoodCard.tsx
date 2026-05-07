import Link from 'next/link'
import Image from 'next/image'
import type { FoodMeta } from '@/lib/food'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default function FoodCard({ post }: { post: FoodMeta }) {
  return (
    <Link
      href={`/food/${post.slug}`}
      className="block group relative overflow-hidden rounded-[6px] aspect-[4/3] border"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* 封面图 */}
      {post.cover ? (
        <Image
          src={post.cover}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-sm"
          style={{ backgroundColor: 'var(--color-tag-bg)', color: 'var(--color-muted)' }}
        >
          {post.title}
        </div>
      )}

      {/* 底部渐变遮罩 + 文字 */}
      <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="text-white text-[15px] font-bold leading-snug line-clamp-1">
          {post.title}
        </h3>
        <p className="text-white/80 text-[12px] mt-1 flex items-center gap-1">
          <span>📍</span>
          <span>{post.location}</span>
        </p>
      </div>

      {/* 图片数量角标 */}
      {post.images.length > 0 && (
        <span
          className="absolute top-3 right-3 px-2 py-0.5 rounded-[3px] text-[11px] font-semibold text-white/90"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          {post.images.length} 图
        </span>
      )}
    </Link>
  )
}
