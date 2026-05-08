import { getFoodPostBySlug, getAllFoodPosts } from '@/lib/food'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export async function generateStaticParams() {
  const posts = getAllFoodPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getFoodPostBySlug(slug)
  if (!post) return {}
  return {
    title: `${post.title} - 美食地图`,
    description: post.excerpt,
  }
}

export default async function FoodPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getFoodPostBySlug(slug)
  if (!post) notFound()

  const relatedPosts = getAllFoodPosts()
    .filter((p) => p.slug !== slug)
    .slice(0, 3)

  return (
    <article className="max-w-[750px] mx-auto">
      <div className="card p-[30px] md:p-[45px]">
        {/* 封面图 */}
        {post.cover && (
          <div className="relative w-full aspect-[2/1] rounded-[6px] overflow-hidden mb-[35px]">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* 文章头部 */}
        <header className="mb-[35px] text-center">
          {/* 标签 */}
          <div className="flex items-center justify-center gap-2 mb-[15px]">
            {post.tags.map((tag) => (
              <span key={tag} className="tag-pill">{tag}</span>
            ))}
          </div>

          {/* 标题 */}
          <h1
            className="text-[28px] md:text-[34px] font-bold mb-[15px] leading-[1.35]"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            {post.title}
          </h1>

          {/* 地点 & 日期 */}
          <div
            className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span>📍 {post.location}</span>
            <span style={{ color: 'var(--color-border-hover)' }}>/</span>
            <time>{formatDate(post.date)}</time>
            <span style={{ color: 'var(--color-border-hover)' }}>/</span>
            <span>{post.address}</span>
          </div>
        </header>

        <hr className="divider" />

        {/* 文章正文 */}
        <div
          className="prose max-w-none
            prose-headings:font-bold
            prose-headings:tracking-[0.01em]
            prose-p:text-[16px] prose-p:leading-[1.85] prose-p:tracking-[0.005em]
            prose-a:no-underline prose-a:border-b prose-a:border-dotted prose-a:pb-[1px]
            prose-a:transition-colors prose-a:hover:border-solid
            prose-img:rounded-[6px] prose-img:mx-auto
            prose-code:px-[5px] prose-code:py-[1px] prose-code:rounded-[3px] prose-code:text-[14px] prose-code:before:content-none prose-code:after:content-none
            prose-pre:rounded-[6px] prose-pre:shadow-sm
            prose-blockquote:border-l-[3px] prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:not-italic prose-blockquote:text-[15px]
            prose-li:text-[16px] prose-li:leading-[1.75]
          "
        >
          <MDXRemote source={post.content} />
        </div>

        {/* 图集 */}
        {post.images.length > 1 && (
          <>
            <hr className="divider" />
            <h3
              className="text-[18px] font-bold mb-4"
              style={{
                color: 'var(--color-text-primary)',
                fontFamily: "Georgia, 'Noto Serif SC', serif",
              }}
            >
              📸 更多图片
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {post.images.slice(1).map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-[4/3] rounded-[4px] overflow-hidden"
                  style={{ backgroundColor: 'var(--color-bg-surface)' }}
                >
                  <Image
                    src={img}
                    alt={`${post.title} - 图${i + 2}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* 标签 */}
        <div className="mt-8 flex items-center flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>

      {/* 相关探店 */}
      {relatedPosts.length > 0 && (
        <div className="card p-[30px] md:p-[40px] mt-8">
          <h3
            className="text-[18px] font-bold mb-5"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            更多探店记录
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {relatedPosts.map((rp) => (
              <Link
                key={rp.slug}
                href={'/food/' + rp.slug}
                className="block group"
              >
                <div
                  className="w-full aspect-[4/3] rounded-[4px] overflow-hidden mb-2"
                  style={{ backgroundColor: 'var(--color-bg-surface)' }}
                >
                  {rp.cover && (
                    <Image
                      src={rp.cover}
                      alt={rp.title}
                      width={400}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                    />
                  )}
                </div>
                <h4
                  className="text-[14px] font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-[var(--color-accent)]"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {rp.title}
                </h4>
                <span className="text-[12px] mt-1 block" style={{ color: 'var(--color-text-hint)' }}>
                  📍 {rp.location}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 返回 */}
      <div className="text-center mt-8">
        <Link
          href="/food"
          className="text-[14px] font-medium transition-colors inline-flex items-center gap-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          &larr; 返回美食地图
        </Link>
      </div>
    </article>
  )
}
