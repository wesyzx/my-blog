import { getAllFoodPosts } from '@/lib/food'
import FoodCard from '@/components/FoodCard'
import FoodMapWrapper from '@/components/FoodMapWrapper'

export const metadata = {
  title: '美食地图',
  description: '记录探访过的美食，用味蕾丈量这座城市。',
}

export default function FoodPage() {
  const posts = getAllFoodPosts()

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* 头部 */}
      <div className="mb-8">
        <h1
          className="text-[32px] font-bold mb-2"
          style={{
            color: 'var(--color-heading)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          美食地图
        </h1>
        <p className="text-[15px]" style={{ color: 'var(--color-muted)' }}>
          记录探访过的美食，用味蕾丈量这座城市。
        </p>
      </div>

      {/* 地图 */}
      <section className="mb-10">
        <h2
          className="text-[18px] font-bold mb-4 flex items-center gap-2"
          style={{
            color: 'var(--color-heading)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          <span style={{ color: 'var(--color-primary)' }}>📍</span> 探店地图
        </h2>
        <FoodMapWrapper posts={posts} />
      </section>

      {/* 图集 */}
      <section>
        <h2
          className="text-[18px] font-bold mb-4 flex items-center gap-2"
          style={{
            color: 'var(--color-heading)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          <span style={{ color: 'var(--color-primary)' }}>📸</span> 美食图集
        </h2>

        {posts.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              还没有美食记录，快去探店吧 🍜
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {posts.map((post) => (
              <FoodCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
