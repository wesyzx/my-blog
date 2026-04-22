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
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex gap-4 flex-wrap mb-10 pb-4 border-b border-gray-100">
        {categories.map((cat, i) => {
          const isFirst = i === 0;
          const active = isFirst ? !current : current === cat;
          const href = isFirst ? "/" : "/?category=" + cat;
          return (
            <a
              key={cat}
              href={href}
              className={"text-sm transition-colors " +
                (active
                  ? "text-gray-900 font-medium"
                  : "text-gray-500 hover:text-gray-900")}
            >
              {cat}
            </a>
          );
        })}
      </div>

      <div className="flex flex-col gap-0">
        {filtered.length === 0 ? (
          <p className="text-center py-20 text-gray-400 text-sm">暂无文章</p>
        ) : (
          filtered.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))
        )}
      </div>

      {/* 模拟分页 UI，匹配目标设计 */}
      <div className="mt-12 flex items-center gap-3 text-sm text-gray-500">
        <span className="w-8 h-8 flex items-center justify-center rounded bg-gray-900 text-white font-medium">1</span>
        <span className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer transition-colors">2</span>
        <span className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer transition-colors">3</span>
        <span className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer transition-colors">4</span>
        <span className="px-1 text-gray-400">…</span>
        <span className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer transition-colors">16</span>
        <span className="px-3 h-8 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer transition-colors">下一个</span>
      </div>
    </div>
  );
}
