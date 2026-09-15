import Link from 'next/link'
import { getAllCategories, getAllPosts } from '@/lib/posts'
import PostCard from '@/components/PostCard'
import Icon from '@/components/Icon'

const POSTS_PER_PAGE = 10

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }) {
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
    return query.size ? `/?${query}` : '/'
  }

  return (
    <div className="home-shell animate-fade-up">
      <section className="home-intro">
        <div><p className="eyebrow">OUTSIDE THE ORBIT</p><h1>慢慢记录，<br />用心感受。</h1><p className="home-lead">这里记录我的美食探访、生活日常和技术折腾。回忆已成，故事待叙，后会有期。</p></div>
        <span className="intro-icon"><Icon name="orbit" /></span>
      </section>
      <nav className="category-filter" aria-label="文章分类">
        {categories.map((item) => { const value = item === '全部' ? '' : item; return <Link key={item} href={value ? `/?category=${encodeURIComponent(value)}` : '/'} className={category === value ? 'active' : ''}>{item}</Link> })}
      </nav>
      <section className="post-list" aria-label="文章列表">
        {pagedPosts.length > 0 ? pagedPosts.map((post, index) => <PostCard key={`${post.slug}-${index}`} post={post} />) : <div className="empty-state">这个分类还没有文章。</div>}
      </section>
      {totalPages > 1 && <nav className="pagination" aria-label="文章分页">
        {page > 1 ? <Link href={pageHref(page - 1)}><Icon name="arrow-left" />上一页</Link> : <span />}
        <span>第 {page} / {totalPages} 页</span>
        {page < totalPages ? <Link href={pageHref(page + 1)}>下一页<Icon name="arrow-right" /></Link> : <span />}
      </nav>}
    </div>
  )
}
