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
    <div className="max-w-[800px] mx-auto px-6 py-12 md:py-20 animate-fade-up">
      {/* 页面头部 */}
      <header className="mb-16">
        <h1
          className="text-[32px] md:text-[40px] font-bold mb-4"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          美食地图
        </h1>
        <p className="text-[15px] text-[var(--color-text-muted)]">
          记录探访过的美食，用味蕾丈量这座城市。
        </p>
      </header>

      {/* 地图 */}
      <section className="mb-16">
        <h2
          className="text-[20px] font-bold mb-6 flex items-center gap-2 text-[var(--color-text-primary)]"
          style={{ fontFamily: "Georgia, 'Noto Serif SC', serif" }}
        >
          <span style={{ color: 'var(--color-accent)' }}>📍</span> 探店地图
        </h2>
        <div className="rounded-xl overflow-hidden border border-[var(--color-border)] shadow-sm">
          <FoodMapWrapper posts={posts} />
        </div>
      </section>

      {/* 图集 */}
      <section>
        <h2
          className="text-[20px] font-bold mb-6 flex items-center gap-2 text-[var(--color-text-primary)]"
          style={{ fontFamily: "Georgia, 'Noto Serif SC', serif" }}
        >
          <span style={{ color: 'var(--color-accent)' }}>📸</span> 美食图集
        </h2>

        {posts.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-[var(--color-border)] rounded-xl">
            <p className="text-sm text-[var(--color-text-muted)]">
              还没有美食记录，快去探店吧 🍜
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {posts.map((post) => (
              <FoodCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
