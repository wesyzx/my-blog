/**
 * 博客首页 - 极简单列布局
 *
 * 参考 veryjack.com：
 * - 移除侧边栏，页面居中
 * - 移除置顶大图，所有文章统一列表展示
 * - 限制容器宽度优化阅读体验
 */
import { getAllPosts } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import AuthorCard from "@/components/AuthorCard";

const POSTS_PER_PAGE = 10;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const currentCategory = params.category ?? "";
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const allPosts = getAllPosts();

  const filtered = currentCategory
    ? allPosts.filter((p) => p.category === currentCategory)
    : allPosts;

  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * POSTS_PER_PAGE;
  const pagedPosts = filtered.slice(start, start + POSTS_PER_PAGE);

  function pageHref(page: number): string {
    const p = new URLSearchParams();
    if (currentCategory) p.set("category", currentCategory);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    return qs ? "/?" + qs : "/";
  }

  return (
    <div className="max-w-[1080px] mx-auto px-6 py-12 md:py-20 animate-fade-up">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
        {/* 左侧：文章列表和分类 */}
        <div className="min-w-0">
          {/* ===== 文章列表区 ===== */}
          <section className="grid grid-cols-1 gap-8">
            {pagedPosts.length > 0 ? (
              pagedPosts.map((post, index) => (
                <PostCard key={`${post.slug}-${index}`} post={post} />
              ))
            ) : (
              <div className="py-20 text-center text-[var(--color-text-muted)] col-span-full">
                暂无相关文章
              </div>
            )}
          </section>

          {/* ===== 分页 ===== */}
          {totalPages > 1 && (
            <nav className="mt-20 pt-10 border-t border-[var(--color-border)] flex items-center justify-between text-[14px]">
              <div>
                {safePage > 1 ? (
                  <Link href={pageHref(safePage - 1)} className="text-[var(--color-accent)] hover:underline">
                    ← 上一页
                  </Link>
                ) : (
                  <span className="text-[var(--color-text-hint)] opacity-50 cursor-not-allowed">← 上一页</span>
                )}
              </div>
              
              <div className="text-[var(--color-text-muted)] tracking-widest font-serif">
                {safePage} / {totalPages}
              </div>

              <div>
                {safePage < totalPages ? (
                  <Link href={pageHref(safePage + 1)} className="text-[var(--color-accent)] hover:underline">
                    下一页 →
                  </Link>
                ) : (
                  <span className="text-[var(--color-text-hint)] opacity-50 cursor-not-allowed">下一页 →</span>
                )}
              </div>
            </nav>
          )}
        </div>

        {/* 右侧：侧边栏 */}
        <aside className="hidden lg:block">
          <div className="sticky top-[80px]">
            <AuthorCard />
          </div>
        </aside>
      </div>
    </div>
  );
}
