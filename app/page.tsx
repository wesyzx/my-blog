/**
 * 博客首页 - 极简单列布局
 *
 * 参考 veryjack.com：
 * - 移除侧边栏，页面居中
 * - 移除置顶大图，所有文章统一列表展示
 * - 限制容器宽度优化阅读体验
 */
import { getAllPosts, getAllCategories } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import Link from "next/link";

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
  const categories = getAllCategories();

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
    <div className="max-w-[720px] mx-auto px-6 py-12 md:py-20 animate-fade-up">
      
      {/* ===== 头部：标题与分类 ===== */}
      <header className="mb-16">
        <h1 
          className="text-[32px] md:text-[40px] font-bold mb-8 text-[var(--color-text-primary)]"
          style={{ fontFamily: "Georgia, 'Noto Serif SC', serif" }}
        >
          {currentCategory || "莫赶 / 博文"}
        </h1>
        
        {/* 分类切换栏 */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className={`text-[13px] px-3 py-1 rounded-md transition-colors ${
              !currentCategory
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] bg-[var(--color-bg-surface)]'
            }`}
          >
            全部
          </Link>
          {categories.map((cat) => {
            const active = currentCategory === cat;
            if (cat === '全部') return null;
            return (
              <Link
                key={cat}
                href={`/?category=${cat}`}
                className={`text-[13px] px-3 py-1 rounded-md transition-colors ${
                  active
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] bg-[var(--color-bg-surface)]'
                }`}
              >
                {cat}
              </Link>
            );
          })}
        </div>
      </header>

      {/* ===== 文章列表区 ===== */}
      <section className="space-y-4">
        {pagedPosts.length > 0 ? (
          pagedPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))
        ) : (
          <div className="py-20 text-center text-[var(--color-text-muted)]">
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
  );
}
