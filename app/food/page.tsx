import { getAllFoodPosts } from '@/lib/food'
import FoodCard from '@/components/FoodCard'
import FoodMapWrapper from '@/components/FoodMapWrapper'
import { createPageMetadata } from '@/lib/metadata'
import PageHeader from '@/components/PageHeader'

export const metadata = createPageMetadata({ title: '美食地图', description: '记录探访过的美食，用味蕾丈量这座城市。', path: '/food' })

// 美食列表跟着内容源走，必须每次请求重新渲染 —— 静态页的响应头会被 EdgeOne 缓存住，
// 删掉的店还会继续挂在列表和地图上（原因详见 app/say/page.tsx 里的说明）。
export const dynamic = 'force-dynamic'

export default async function FoodPage() {
  const posts = await getAllFoodPosts()
  return (
    <div className="page-shell animate-fade-up">
      <PageHeader title="美食地图" />
      <section className="food-section">
        <div className="section-header-row">
          <h2 className="section-title">探店地图</h2>
          <span className="section-note">{posts.length} 个地点</span>
        </div>
        <div className="flat-panel"><FoodMapWrapper posts={posts} /></div>
      </section>
      <section className="food-section">
        <div className="section-header-row">
          <h2 className="section-title">最近探访</h2>
          <span className="section-note">{posts.length} 篇记录</span>
        </div>
        {posts.length === 0 ? <div className="empty-state">还没有美食记录。</div> : <div className="food-grid">{posts.map((post) => <FoodCard key={post.slug} post={post} />)}</div>}
      </section>
    </div>
  )
}
