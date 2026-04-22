import { getAllPosts, getAllCategories } from "@/lib/posts";
import PostCard from "@/components/PostCard";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const allPosts = getAllPosts();
  const categories = getAllCategories();
  const current = params.category ?? "";

  const filtered = current
    ? allPosts.filter((p) => p.category === current)
    : allPosts;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_250px] gap-8 max-w-[1100px] mx-auto">
      <section>
        <div className="text-[14px] text-[#475671] flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
          <span className="font-semibold">分类：</span>
          {categories.map((cat, idx) => {
            const isAll = idx === 0
            const active = isAll ? !current : current === cat
            const href = isAll ? "/" : "/?category=" + cat

            return (
              <a
                key={cat}
                href={href}
                className={
                  "transition-colors " +
                  (active
                    ? "text-[#293241] font-semibold"
                    : "text-[#475671] hover:text-[#98c1d9]")
                }
              >
                {cat}
              </a>
            )
          })}
        </div>

        <div className="flex flex-col gap-0 bg-white px-2 md:px-0">
          {filtered.length === 0 ? (
            <p className="text-center py-20 text-[#475671] text-sm">暂无文章</p>
          ) : (
            filtered.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))
          )}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[15px] font-medium text-[#293241]">
          <span className="w-10 h-10 flex items-center justify-center rounded-[3px] bg-[#98c1d9] text-white">1</span>
          <span className="w-10 h-10 flex items-center justify-center hover:text-[#98c1d9] cursor-pointer transition-colors">2</span>
          <span className="w-10 h-10 flex items-center justify-center hover:text-[#98c1d9] cursor-pointer transition-colors">3</span>
          <span className="w-10 h-10 flex items-center justify-center hover:text-[#98c1d9] cursor-pointer transition-colors">4</span>
          <span className="px-1 text-[#475671]">…</span>
          <span className="w-10 h-10 flex items-center justify-center hover:text-[#98c1d9] cursor-pointer transition-colors">16</span>
          <span className="px-3 h-10 flex items-center justify-center hover:text-[#98c1d9] cursor-pointer transition-colors">下一个</span>
        </div>
      </section>

      <aside className="hidden lg:block">
        <div className="sticky top-6">
          <div className="w-[90px] h-[90px] mx-auto rounded-full bg-[#f0f4f9] border border-[#e1e8f1] flex items-center justify-center text-[36px] text-[#8a9bb8] font-light">
            C
          </div>
          <h3 className="text-center mt-3 text-[15px] font-semibold text-[#293241]">Can Chou</h3>
          <p className="text-center mt-1 text-[12px] text-[#66778f] leading-tight">
            Blogger | 摄影爱好者 | 字典官
          </p>
          <div className="mt-3 flex items-center justify-center gap-3 text-[#66778f] text-[13px]">
            <span className="hover:text-[#98c1d9] cursor-pointer">◉</span>
            <span className="hover:text-[#98c1d9] cursor-pointer">✕</span>
            <span className="hover:text-[#98c1d9] cursor-pointer">◈</span>
            <span className="hover:text-[#98c1d9] cursor-pointer">✉</span>
            <span className="hover:text-[#98c1d9] cursor-pointer">RSS</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
