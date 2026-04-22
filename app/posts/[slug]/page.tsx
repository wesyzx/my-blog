import { getPostBySlug, getAllPosts } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import Image from 'next/image'

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

  return (
    <article className="max-w-2xl mx-auto px-4 py-10">
      {/* 文章头部 */}
      <div className="mb-8">
        {/* 分类 */}
        <span className="text-xs text-gray-400 tracking-wide">
          {post.category}
        </span>

        {/* 标题 */}
        <h1 className="text-2xl font-serif font-bold text-gray-900 mt-2 mb-3 leading-snug">
          {post.title}
        </h1>

        {/* 日期 */}
        <div className="flex items-center gap-4 text-xs text-gray-300">
          <span>{formatDate(post.date)}</span>
        </div>
      </div>

      {/* 封面图 */}
      {post.cover && (
        <div className="relative w-full h-56 rounded-2xl overflow-hidden mb-8">
          <Image
            src={post.cover}
            alt={post.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* 文章正文 */}
      <div className="prose prose-gray prose-sm max-w-none
        prose-headings:font-serif
        prose-headings:text-gray-900
        prose-p:text-gray-600
        prose-p:leading-relaxed
        prose-a:text-gray-900
        prose-a:underline-offset-4
        prose-img:rounded-xl
        prose-code:text-gray-800
        prose-code:bg-gray-100
        prose-code:px-1.5
        prose-code:py-0.5
        prose-code:rounded
        prose-code:text-xs
        prose-pre:bg-gray-950
        prose-pre:rounded-xl
      ">
        <MDXRemote source={post.content} />
      </div>

      {/* 返回 */}
      <div className="mt-16 pt-8 border-t border-gray-100">
        <a
          href="/"
          className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
        >
          ← 返回首页
        </a>
      </div>
    </article>
  )
}