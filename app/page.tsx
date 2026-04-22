import { getAllPosts, getAllCategories } from "@/lib/posts";
import PostCard from "@/components/PostCard";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const allPosts = getAllPosts();
  const current = params.category ?? "";

  const filtered = current
    ? allPosts.filter((p) => p.category === current)
    : allPosts;

  return (
    <div>
      <div className="flex flex-col gap-0">
        {filtered.length === 0 ? (
          <p className="text-center py-20 text-[#475671] text-sm">暂无文章</p>
        ) : (
          filtered.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))
        )}
      </div>

      {/* 模拟分页 UI，匹配目标设计 */}
      <div className="mt-[20px] flex items-center justify-center gap-2 text-[15px] font-medium text-[#293241]">
        <span className="w-10 h-10 flex items-center justify-center rounded-[3px] bg-[#98c1d9] text-white">1</span>
        <span className="w-10 h-10 flex items-center justify-center hover:text-[#98c1d9] cursor-pointer transition-colors">2</span>
        <span className="w-10 h-10 flex items-center justify-center hover:text-[#98c1d9] cursor-pointer transition-colors">3</span>
        <span className="w-10 h-10 flex items-center justify-center hover:text-[#98c1d9] cursor-pointer transition-colors">4</span>
        <span className="px-1 text-[#475671]">…</span>
        <span className="w-10 h-10 flex items-center justify-center hover:text-[#98c1d9] cursor-pointer transition-colors">16</span>
        <span className="px-3 h-10 flex items-center justify-center hover:text-[#98c1d9] cursor-pointer transition-colors">下一个 »</span>
      </div>
    </div>
  );
}
