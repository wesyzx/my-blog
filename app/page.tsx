/**
 * 博客首页
 *
 * 布局结构：
 * 1. 置顶推荐文章（Hero 区域，大图 + 标题 + 摘要）
 * 2. 左侧：分类切换栏 + 文章卡片流（2 列网格）+ 分页
 * 3. 右侧：作者信息卡片 + 标签云
 *
 * 支持 URL 参数：
 *   ?category=生活  → 按分类筛选
 *   ?page=2         → 翻页
 */
import { getAllPosts, getAllCategories } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import Image from "next/image";

// 每页显示文章数量
const POSTS_PER_PAGE = 6;

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

  // 提取 Featured Post (第一篇且非分类过滤时)
  const featuredPost = !currentCategory && safePage === 1 ? pagedPosts[0] : null;
  const listPosts = featuredPost ? pagedPosts.slice(1) : pagedPosts;

  function pageHref(page: number): string {
    const params = new URLSearchParams();
    if (currentCategory) params.set("category", currentCategory);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? "/?" + qs : "/";
  }

  function renderPagination() {
    if (totalPages <= 1) return null;
    return (
      <div className="mt-16 flex items-center justify-center gap-4 text-[13px] font-medium animate-fade-up">
        {safePage > 1 && (
          <Link href={pageHref(safePage - 1)} className="hover:text-[var(--color-accent)]">← PREV</Link>
        )}
        <span className="text-[var(--color-text-muted)] tracking-widest">{safePage} / {totalPages}</span>
        {safePage < totalPages && (
          <Link href={pageHref(safePage + 1)} className="hover:text-[var(--color-accent)]">NEXT →</Link>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12">
      
      {/* 1. Hero / Featured Post 区域 */}
      {featuredPost && (
        <section className="mb-20 animate-fade-up">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center bg-[var(--color-bg-surface)] rounded-[var(--radius-xl)] p-8 border border-[var(--color-border)]">
            <Link href={`/posts/${featuredPost.slug}`} className="block relative aspect-video rounded-[var(--radius-lg)] overflow-hidden shadow-sm">
              <Image 
                src={featuredPost.cover || '/next.svg'} 
                alt={featuredPost.title} 
                fill 
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
            </Link>
            <div className="flex flex-col gap-4">
              <span className="tag-category self-start">{featuredPost.category}</span>
              <h2 className="text-[28px] md:text-[32px] font-medium leading-tight">
                <Link href={`/posts/${featuredPost.slug}`} className="hover:text-[var(--color-accent)] transition-colors">
                  {featuredPost.title}
                </Link>
              </h2>
              <p className="text-[15px] text-[var(--color-text-secondary)] line-clamp-3">
                {featuredPost.excerpt}
              </p>
              <div className="flex items-center gap-4 mt-4 text-[12px] text-[var(--color-text-muted)]">
                 <span>{new Date(featuredPost.date).toLocaleDateString('zh-CN')}</span>
                 <span className="subtitle-en opacity-40">FEATURED LOG</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. 主体内容：分类与文章列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-12">
        
        {/* 左侧文章流 */}
        <main>
          {/* 分类切换器 */}
          <div className="flex flex-wrap gap-3 mb-12 border-b border-[var(--color-border)] pb-6">
            {categories.map((cat, idx) => {
              const active = idx === 0 ? !currentCategory : currentCategory === cat;
              return (
                <Link
                  key={cat}
                  href={idx === 0 ? "/" : `/?category=${cat}`}
                  className={`tag-pill ${active ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white' : ''}`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-up">
            {listPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
          
          {renderPagination()}
        </main>

        {/* 右侧侧边栏 */}
        <aside className="hidden lg:block space-y-8 animate-fade-up">
          {/* 1. 作者卡片 */}
          <div className="sidebar-widget text-center">
            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border border-[var(--color-border)] mb-4">
              <Image
                src="https://img.guanyan.me/2026/05/fa7d85a90137299c295a3cdbe9790395.png"
                alt="Can Chou"
                width={80}
                height={80}
                className="object-cover"
              />
            </div>
            <h3 className="text-[16px] font-medium mb-1">Can Chou</h3>
            <p className="subtitle-en mb-4">The Unhurried Pilot</p>
            <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed px-2">
              为食而生，保持克制，记录日常。
            </p>
            <div className="flex justify-center gap-3 mt-6">
               <a href="#" className="w-8 h-8 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[12px] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">𝕏</a>
               <a href="#" className="w-8 h-8 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[12px] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">GH</a>
               <a href="#" className="w-8 h-8 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[12px] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">RSS</a>
            </div>
          </div>

          {/* 2. 标签云占位 */}
          <div className="sidebar-widget">
            <h4 className="text-[11px] font-bold tracking-[0.1em] text-[var(--color-text-muted)] mb-4 uppercase">Tags / 标签云</h4>
            <div className="flex flex-wrap gap-2">
               {['摄影', '旅行', '代码', '美食', '思考'].map(tag => (
                 <span key={tag} className="tag-pill text-[11px] px-3 py-1 cursor-pointer">#{tag}</span>
               ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
