import Image from 'next/image'
import Link from 'next/link'
import { getAllCategories, getAllPosts } from '@/lib/posts'
import { getAllFoodPosts } from '@/lib/food'
import { getAllGalleryItems } from '@/lib/gallery'
import PostCard from '@/components/PostCard'
import Icon from '@/components/Icon'

const POSTS_PER_PAGE = 10

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }) {
  const params = await searchParams
  const category = params.category ?? ''
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const posts = getAllPosts()
  const foodCount = (await getAllFoodPosts()).length
  const galleryCount = getAllGalleryItems().length
  const categories = getAllCategories()
  const filtered = category ? posts.filter((post) => post.category === category) : posts
  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE))
  const page = Math.min(requestedPage, totalPages)
  const pagedPosts = filtered.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE)
  const activeCells = new Set(posts.map((post) => {
    let value = 0
    for (const character of post.date) value = (value * 31 + character.charCodeAt(0)) % 70
    return value
  }))

  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams()
    if (category) query.set('category', category)
    if (nextPage > 1) query.set('page', String(nextPage))
    return query.size ? `/?${query}` : '/'
  }

  return (
    <div className="home-shell animate-fade-up">
      <section className="home-banner" aria-label="城市一隅">
        <Image src="/home-memory.png" alt="色彩丰富的街头墙绘" fill priority sizes="(max-width: 760px) 100vw, 720px" />
        <div><time>2026.06</time><strong>城市一隅</strong></div>
      </section>

      <section className="activity-panel" aria-label="记录足迹">
        <div className="activity-months" aria-hidden="true"><span>Sep</span><span>Nov</span><span>Jan</span><span>Mar</span><span>May</span><span>Jul</span></div>
        <div className="activity-grid" aria-hidden="true">
          {Array.from({ length: 70 }, (_, index) => <span key={index} className={activeCells.has(index) ? `level-${(index % 3) + 1}` : ''} />)}
        </div>
        <p>per aspera ad astra.</p>
      </section>

      <section className="home-intro">
        <div><p className="eyebrow">@ CAN CHOU</p><h1>慢慢记录，<br />用心感受。</h1><p className="home-lead">这里记录我的美食探访、生活日常和技术折腾。回忆已成，故事待叙，后会有期。</p></div>
        <div className="home-profile-mark"><Icon name="orbit" /></div>
      </section>
      <div className="home-facts" aria-label="博客内容统计"><span>✏️ {posts.length} 篇博文</span><span>📷 {galleryCount} 组相册</span><span>🍜 {foodCount} 家小店</span></div>
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
