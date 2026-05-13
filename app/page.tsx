/**
 * 博客首页
 *
 * 支持 URL 参数：
 *   ?category=生活 → 按分类筛选
 *   ?page=2        → 翻页
 *
 * 参考图2布局：作者信息在右上角，文章列表在下
 */
import { getAllPosts, getAllCategories } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import Image from "next/image";

const POSTS_PER_PAGE = 6;

/** 作者卡片（复用组件） */
function AuthorCard() {
  return (
    <div className="text-center">
      <div
        className="w-[64px] h-[64px] mx-auto rounded-full overflow-hidden mb-3"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      >
        <Image
          src="https://img.guanyan.me/2026/05/fa7d85a90137299c295a3cdbe9790395.png"
          alt="Can Chou"
          width={64}
          height={64}
          className="object-cover"
        />
      </div>
      <h3 className="text-[15px] font-semibold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
        Can Chou
      </h3>
      <p className="text-[11px] tracking-[0.06em] mb-3" style={{ color: 'var(--color-text-hint)' }}>
        THE UNHURRIED PILOT
      </p>
      <p className="text-[12px] leading-relaxed px-1" style={{ color: 'var(--color-text-muted)' }}>
        为食而生，保持克制，记录日常。
      </p>
      <div className="flex justify-center gap-3 mt-4">
        <a href="#" className="p-1.5 rounded-full hover:bg-[var(--color-bg-surface)] transition-colors" style={{ color: 'var(--color-text-muted)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
        </a>
        <a href="#" className="p-1.5 rounded-full hover:bg-[var(--color-bg-surface)] transition-colors" style={{ color: 'var(--color-text-muted)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>
        </a>
        <a href="/rss.xml" className="p-1.5 rounded-full hover:bg-[var(--color-bg-surface)] transition-colors" style={{ color: 'var(--color-text-muted)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11a9 9 0 019 9"/><path d="M4 4a16 16 0 0116 16"/><circle cx="5" cy="19" r="1"/></svg>
        </a>
      </div>
    </div>
  );
}

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

  const featuredPost = !currentCategory && safePage === 1 ? pagedPosts[0] : null;
  const listPosts = featuredPost ? pagedPosts.slice(1) : pagedPosts;

  function pageHref(page: number): string {
    const p = new URLSearchParams();
    if (currentCategory) p.set("category", currentCategory);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    return qs ? "/?" + qs : "/";
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10 md:py-14">

      {/* ===== 分类筛选标题 ===== */}
      {currentCategory && (
        <div className="mb-14 text-center">
          <p className="text-[12px] tracking-[0.15em] uppercase mb-2" style={{ color: 'var(--color-text-hint)' }}>
            Category
          </p>
          <h1
            className="text-[36px] font-bold"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            {currentCategory}
          </h1>
          <p className="text-[13px] mt-3" style={{ color: 'var(--color-text-muted)' }}>
            {filtered.length} 篇文章
          </p>
        </div>
      )}

      {/* ===== 上排：Featured Post（左）+ 作者卡片（右上） ===== */}
      {featuredPost && (
        <section className="mb-14 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-10">
          {/* Featured Post */}
          <div>
            <Link
              href={`/posts/${featuredPost.slug}`}
              className="block relative aspect-[21/9] w-full overflow-hidden rounded-xl mb-5"
              style={{ backgroundColor: 'var(--color-bg-surface)' }}
            >
              <Image
                src={featuredPost.cover || '/next.svg'}
                alt={featuredPost.title}
                fill
                className="object-cover hover:scale-[1.02] transition-transform duration-700"
                priority
              />
            </Link>
            <span
              className="inline-block text-[11px] font-medium tracking-[0.1em] px-2.5 py-1 rounded-full border mb-3"
              style={{ color: 'var(--color-accent)', borderColor: 'var(--color-accent)', opacity: 0.7 }}
            >
              {featuredPost.category}
            </span>
            <h2 className="text-[24px] md:text-[28px] font-bold leading-[1.35] mb-3">
              <Link href={`/posts/${featuredPost.slug}`} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-primary)' }}>
                {featuredPost.title}
              </Link>
            </h2>
            <p className="text-[14px] leading-[1.8] line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
              {featuredPost.excerpt}
            </p>
          </div>

          {/* 作者卡片 — 右上角 */}
          <aside className="hidden lg:block pt-2">
            <AuthorCard />
          </aside>
        </section>
      )}

      {/* ===== 下排：分类切换 + 文章列表 ===== */}
      {/* 分类切换栏 */}
      <div className="flex flex-wrap items-center gap-1 mb-10">
        <Link
          href="/"
          className={`text-[13px] font-medium px-3.5 py-1.5 rounded-full transition-colors ${
            !currentCategory
              ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-page)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]'
          }`}
        >
          全部
        </Link>
        {categories.map((cat) => {
          const active = currentCategory === cat;
          return (
            <Link
              key={cat}
              href={`/?category=${cat}`}
              className={`text-[13px] font-medium px-3.5 py-1.5 rounded-full transition-colors ${
                active
                  ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-page)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]'
              }`}
            >
              {cat}
            </Link>
          );
        })}
      </div>

      {/* 文章列表区 */}
      {featuredPost ? (
        /* 有 Featured 时：文章全宽两列，无侧边栏 */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
          {listPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        /* 无 Featured 时：文章（左）+ 侧边栏（右） */
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
            {listPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-[80px] space-y-10">
              <AuthorCard />
              <div style={{ borderTop: '0.5px solid var(--color-border)' }} />
              <div>
                <h4 className="text-[10px] font-bold tracking-[0.15em] uppercase mb-4" style={{ color: 'var(--color-text-hint)' }}>
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {categories.map(tag => (
                    <Link
                      key={tag}
                      href={`/?category=${tag}`}
                      className="text-[12px] px-3 py-1 rounded-full transition-colors hover:text-[var(--color-accent)]"
                      style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-surface)' }}
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-16 flex items-center justify-center gap-6 text-[13px] font-medium">
          {safePage > 1 && (
            <Link href={pageHref(safePage - 1)} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-secondary)' }}>
              ← PREV
            </Link>
          )}
          <span className="tracking-[0.15em]" style={{ color: 'var(--color-text-hint)' }}>
            {safePage} / {totalPages}
          </span>
          {safePage < totalPages && (
            <Link href={pageHref(safePage + 1)} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-secondary)' }}>
              NEXT →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
