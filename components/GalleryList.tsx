'use client'

/**
 * 相册列表组件 - 封面列表模式
 * 
 * 展示所有相册的封面图、标题和日期。
 * 点击封面进入相册详情页。
 */
import Link from 'next/link'
import Image from 'next/image'
import type { GalleryMeta } from '@/lib/gallery'

export default function GalleryList({ albums }: { albums: GalleryMeta[] }) {
  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12 md:py-20 animate-fade-up">
      {/* 页面头部 */}
      <header className="mb-16">
        <h1
          className="text-[32px] md:text-[40px] font-bold mb-4"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          相册
        </h1>
        <p className="text-[15px] text-[var(--color-text-muted)]">
          随着快门的开启，时间被凝固下来，作为「此时此刻」的记录。
        </p>
      </header>

      {/* 相册封面网格 */}
      {!albums || albums.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[var(--color-border)] rounded-xl">
          <p className="text-[14px] text-[var(--color-text-hint)]">
            还没有相册，快去创作吧 📸
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {albums.map((album) => (
            <Link 
              key={album.slug} 
              href={`/gallery/${album.slug}`}
              className="group flex flex-col"
            >
              {/* 封面图容器 */}
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] shadow-sm group-hover:shadow-md transition-all duration-500">
                {album.cover ? (
                  <Image
                    src={album.cover}
                    alt={album.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--color-text-hint)] text-[13px]">
                    No Cover
                  </div>
                )}
                
                {/* 悬浮遮罩 - 展示照片数量 */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="bg-white/90 backdrop-blur-sm text-black text-[12px] font-medium px-4 py-1.5 rounded-full">
                    {album.images.length} 张照片
                  </span>
                </div>
              </div>

              {/* 相册信息 */}
              <div className="mt-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="tag-category">{album.category}</span>
                  <span className="text-[12px] text-[var(--color-text-hint)] font-serif italic">
                    {album.date ? new Date(album.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '未知日期'}
                  </span>
                </div>
                <h2 className="text-[18px] md:text-[20px] font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors line-clamp-1" style={{ fontFamily: "Georgia, 'Noto Serif SC', serif" }}>
                  {album.title}
                </h2>
                {album.excerpt && (
                  <p className="mt-2 text-[14px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                    {album.excerpt}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
