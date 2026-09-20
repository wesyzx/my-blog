import { getAllFoodPosts } from '@/lib/food'
import FoodCard from '@/components/FoodCard'
import FoodMapWrapper from '@/components/FoodMapWrapper'
import Icon from '@/components/Icon'
import { createPageMetadata } from '@/lib/metadata'

export const metadata = createPageMetadata({ title: '美食地图', description: '记录探访过的美食，用味蕾丈量这座城市。', path: '/food' })

// 美食列表跟着内容源走，必须每次请求重新渲染 —— 静态页的响应头会被 EdgeOne 缓存住，
// 删掉的店还会继续挂在列表和地图上（原因详见 app/say/page.tsx 里的说明）。
export const dynamic = 'force-dynamic'

export default async function FoodPage() {
  const posts = await getAllFoodPosts()
  return (
    <div className="page-shell animate-fade-up">
      <header className="page-header">
        <div className="page-header-meta editorial-meta">JOURNEY / 美食探访</div>
        <h1 className="page-title">美食地图</h1>
        <p className="page-lead">记录探访过的美食，用味蕾丈量这座城市。</p>
      </header>
      <section className="food-section">
        <h2 className="section-title"><Icon name="map" />探店地图</h2>
        <div className="flat-panel"><FoodMapWrapper posts={posts} /></div>
      </section>
      <section className="food-section">
        <div className="section-header-row">
          <h2 className="section-title"><Icon name="image" />美食图集</h2>
          <span className="editorial-meta">{posts.length} SPOTS</span>
        </div>
        {posts.length === 0 ? <div className="empty-state">还没有美食记录。</div> : <div className="food-grid">{posts.map((post) => <FoodCard key={post.slug} post={post} />)}</div>}
      </section>
    </div>
  )
}
