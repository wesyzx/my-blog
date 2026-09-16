import Link from 'next/link'
import { getAllCategories, getAllPosts } from '@/lib/posts'
import PostCard from '@/components/PostCard'
import Icon from '@/components/Icon'
import { createPageMetadata } from '@/lib/metadata'

const POSTS_PER_PAGE = 10

export const metadata = createPageMetadata({
  title: '博文',
  description: '关于技术、生活与一路所见的文章归档。',
  path: '/posts',
})

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }) {
  const params = await searchParams
  const category = params.category ?? ''
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const posts = getAllPosts()
  const categories = getAllCategories()
  const filtered = category ? posts.filter((post) => post.category === category) : posts
  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE))
  const page = Math.min(requestedPage, totalPages)
  const pagedPosts = filtered.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE)

  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams()
    if (category) query.set('category', category)
    if (nextPage > 1) query.set('page', String(nextPage))
    return query.size ? `/posts?${query}` : '/posts'
  }

  return (
    <div className="home-shell posts-shell animate-fade-up">
      <header className="page-header posts-page-header">
        <div className="page-header-meta editorial-meta">WRITING / 文章归档</div>
        <h1 className="page-title">博文</h1>
        <p className="page-lead">关于技术、生活与一路所见。这里是完整目录，按发布时间由近及远排列。</p>
      </header>

      <nav className="category-filter" aria-label="文章分类">
        <span className="category-label editorial-meta">INDEX</span>
        <div className="category-links">
          {categories.map((item) => {
            const value = item === '全部' ? '' : item
            return (
              <Link key={item} href={value ? `/posts?category=${encodeURIComponent(value)}` : '/posts'} className={category === value ? 'active' : ''}>
                {item}
              </Link>
            )
          })}
        </div>
      </nav>

      <section className="post-list" aria-label="文章列表">
        <div className="post-list-header">
          <span className="editorial-meta">ALL WRITING / 目录索引</span>
          <span className="editorial-meta">{filtered.length} ESSAYS</span>
        </div>
        {pagedPosts.length > 0 ? (
          pagedPosts.map((post, index) => (
            <PostCard key={`${post.slug}-${index}`} post={post} index={(page - 1) * POSTS_PER_PAGE + index} />
          ))
        ) : (
          <div className="empty-state">这个分类还没有文章。</div>
        )}
      </section>

      {totalPages > 1 && (
        <nav className="pagination" aria-label="文章分页">
          {page > 1 ? <Link href={pageHref(page - 1)}><Icon name="arrow-left" />上一页</Link> : <span />}
          <span>第 {page} / {totalPages} 页</span>
          {page < totalPages ? <Link href={pageHref(page + 1)}>下一页<Icon name="arrow-right" /></Link> : <span />}
        </nav>
      )}
    </div>
  )
}
