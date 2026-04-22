import { getPostBySlug, getAllPosts } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}) {
  const post = getPostBySlug(params.slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.cover ? [post.cover] : [],
    },
  }
}

export default function PostPage({
  params,
}: {
  params: { slug: string }
}) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()
  const tags = post.tags.length > 0 ? post.tags : [post.category]

  return (
    <article className="bg-white rounded-[5px] p-[30px] md:p-[40px] shadow-[0px_12px_18px_-6px_rgba(34,56,101,0.04)]">
      {/* 封面图 */}
      {post.cover && (
        <div className="relative w-full aspect-[2/1] rounded-[5px] overflow-hidden mb-[30px]">
          <Image
            src={post.cover}
            alt={post.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* 文章头部 */}
      <div className="mb-[30px] text-center">
        {/* 分类 */}
        <div className="flex items-center justify-center gap-2 mb-[15px]">
          <svg width="13" height="13" viewBox="0 0 15 15" className="fill-[#475671]">
            <path d="M14.4,1.2H0.6C0.3,1.2,0,1.5,0,1.9V5c0,0.3,0.3,0.6,0.6,0.6h0.6v7.5c0,0.3,0.3,0.6,0.6,0.6h11.2c0.3,0,0.6-0.3,0.6-0.6V5.6h0.6C14.7,5.6,15,5.3,15,5V1.9C15,1.5,14.7,1.2,14.4,1.2z M12.5,12.5h-10V5.6h10V12.5z M13.8,4.4H1.2V2.5h12.5V4.4z M5.6,7.5c0-0.3,0.3-0.6,0.6-0.6h2.5c0.3,0,0.6,0.3,0.6,0.6S9.1,8.1,8.8,8.1H6.2C5.9,8.1,5.6,7.8,5.6,7.5z"/>
          </svg>
          <span className="text-[12px] font-semibold text-[#475671] uppercase tracking-wide">
            {post.category}
          </span>
        </div>

        {/* 标题 */}
        <h1 className="text-[30px] md:text-[35px] font-bold text-[#293241] mb-[15px] leading-[1.4]">
          {post.title}
        </h1>

        {/* 日期 */}
        <div className="flex items-center justify-center flex-wrap gap-[15px] text-[12px] font-semibold text-[#475671] uppercase">
          <time>{formatDate(post.date)}</time>
          <span className="text-[#98c1d9]">{tags.slice(0, 3).join(', ')}</span>
          <span>0 评论</span>
        </div>
      </div>

      <hr className="my-[30px] border-[#e7e9ef]" />

      {/* 文章正文 */}
      <div className="prose prose-slate max-w-none
        prose-headings:text-[#293241]
        prose-p:text-[#475671]
        prose-p:leading-[1.65]
        prose-a:text-[#98c1d9]
        hover:prose-a:text-[#7db9de]
        prose-a:transition-colors
        prose-a:no-underline
        prose-img:rounded-[5px]
        prose-code:text-[#475671]
        prose-code:bg-[#f3f4f7]
        prose-code:px-[5px]
        prose-code:py-[2px]
        prose-code:rounded-[3px]
        prose-code:text-[14px]
        prose-pre:bg-[#293241]
        prose-pre:rounded-[5px]
        prose-blockquote:border-l-[3px]
        prose-blockquote:border-[#98c1d9]
        prose-blockquote:bg-[#f3f4f7]
        prose-blockquote:px-[20px]
        prose-blockquote:py-[10px]
        prose-blockquote:not-italic
        prose-blockquote:text-[#475671]
      ">
        <MDXRemote source={post.content} />
      </div>

      {/* 返回 */}
      <div className="mt-[50px] pt-[30px] border-t border-[#e7e9ef] text-center">
        <Link
          href="/"
          className="text-[14px] font-medium text-[#475671] hover:text-[#98c1d9] transition-colors"
        >
          ← 返回首页
        </Link>
      </div>
    </article>
  )
}
