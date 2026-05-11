/**
 * 文章详情页
 *
 * 仅展示博文本身：封面图、标题、日期、正文、评论区。
 * 不展示分类标签、相关文章推荐等附加内容。
 */
import { getPostBySlug, getAllPosts } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ArtalkComments from '@/components/ArtalkComments'

/** 格式化日期为中文形式：2026年5月11日 */
function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 构建时预生成所有文章页面（SSG） */
export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

/** 动态 SEO 元数据 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)
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

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) notFound()

  return (
    <article className="max-w-[750px] mx-auto">
      <div className="card p-[30px] md:p-[45px]">
        {/* 封面图 */}
        {post.cover && (
          <div className="relative w-full aspect-[2/1] rounded-[5px] overflow-hidden mb-[35px]">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* 文章头部：标题 + 日期 */}
        <header className="mb-[35px] text-center">
          <h1
            className="text-[28px] md:text-[34px] font-bold mb-[12px] leading-[1.35]"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            {post.title}
          </h1>
          <time
            className="text-[13px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {formatDate(post.date)}
          </time>
        </header>

        <hr className="divider" />

        {/* 文章正文 */}
        <div
          className="prose max-w-none
            prose-headings:font-bold
            prose-headings:tracking-[0.01em]
            prose-p:text-[16px] prose-p:leading-[1.85] prose-p:tracking-[0.005em]
            prose-a:no-underline prose-a:border-b prose-a:border-dotted prose-a:pb-[1px]
            prose-a:transition-colors
            prose-a:hover:border-solid
            prose-img:rounded-[5px] prose-img:mx-auto
            prose-code:px-[5px] prose-code:py-[1px] prose-code:rounded-[3px] prose-code:text-[14px] prose-code:before:content-none prose-code:after:content-none
            prose-pre:rounded-[5px] prose-pre:shadow-sm
            prose-blockquote:border-l-[3px] prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:not-italic prose-blockquote:text-[15px]
            prose-li:text-[16px] prose-li:leading-[1.75]
          "
        >
          <MDXRemote source={post.content} />
        </div>
      </div>

      {/* 评论区 */}
      <div className="card p-[30px] md:p-[40px] mt-8">
        <ArtalkComments pageKey={`/posts/${post.slug}`} pageTitle={post.title} />
      </div>

      {/* 返回首页 */}
      <div className="text-center mt-8">
        <Link
          href="/"
          className="text-[14px] font-medium transition-colors inline-flex items-center gap-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          &larr; 返回首页
        </Link>
      </div>
    </article>
  )
}
