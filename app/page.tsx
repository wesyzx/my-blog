import { getAllPosts, getAllCategories } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import Link from "next/link";

// 设置每页显示的文章数量
const POSTS_PER_PAGE = 5;

/**
 * 博客首页组件
 * 在 Next.js 16 中，Home 组件是一个异步服务器组件
 * searchParams 包含 URL 中的查询参数（如 ?category=技术&page=2）
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  // 1. 获取 URL 参数：在 Next.js 16 中必须使用 await 访问 searchParams
  const params = await searchParams;
  const currentCategory = params.category ?? "";
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // 2. 获取原始数据
  const allPosts = getAllPosts();
  const categories = getAllCategories();

  // 3. 数据过滤：如果指定了分类，则只保留该分类的文章
  const filtered = currentCategory
    ? allPosts.filter((p) => p.category === currentCategory)
    : allPosts;

  // 4. 分页逻辑计算
  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages); // 确保页码不超出范围
  const start = (safePage - 1) * POSTS_PER_PAGE;
  const pagedPosts = filtered.slice(start, start + POSTS_PER_PAGE);

  /**
   * 辅助函数：生成分页跳转的链接
   * @param page 目标页码
   */
  function pageHref(page: number): string {
    const params = new URLSearchParams();
    if (currentCategory) params.set("category", currentCategory);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? "/?" + qs : "/";
  }

  /**
   * 渲染分页按钮组件
   */
  function renderPagination() {
    if (totalPages <= 1) return null;

    const pages: (number | "...")[] = [];
    // 简易的分页页码生成逻辑
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return (
      <div
        className="mt-5 flex items-center justify-center gap-1 text-[14px] font-medium"
        style={{ color: 'var(--color-heading)' }}
      >
        {/* 上一页按钮 */}
        {safePage > 1 ? (
          <Link
            href={pageHref(safePage - 1)}
            className="px-3 h-9 flex items-center justify-center rounded-[3px] transition-colors hover:text-[var(--color-primary)]"
          >
            上一页
          </Link>
        ) : (
          <span
            className="px-3 h-9 flex items-center justify-center rounded-[3px]"
            style={{ color: 'var(--color-light)', cursor: 'not-allowed' }}
          >
            上一页
          </span>
        )}

        {/* 页码数字按钮 */}
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-1" style={{ color: 'var(--color-light)' }}>
              …
            </span>
          ) : (
            <Link
              key={p}
              href={pageHref(p)}
              className="w-9 h-9 flex items-center justify-center rounded-[3px] transition-colors"
              style={
                p === safePage
                  ? { backgroundColor: 'var(--color-primary)', color: '#ffffff' }
                  : { color: 'var(--color-body)' }
              }
            >
              {p}
            </Link>
          )
        )}

        {/* 下一页按钮 */}
        {safePage < totalPages ? (
          <Link
            href={pageHref(safePage + 1)}
            className="px-3 h-9 flex items-center justify-center rounded-[3px] transition-colors hover:text-[var(--color-primary)]"
          >
            下一页
          </Link>
        ) : (
          <span
            className="px-3 h-9 flex items-center justify-center rounded-[3px]"
            style={{ color: 'var(--color-light)', cursor: 'not-allowed' }}
          >
            下一页
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_250px] gap-8 max-w-[1100px] mx-auto">
      {/* ===== 左侧区域：文章列表 ===== */}
      <section>
        {/* 分类筛选栏 */}
        <div
          className="card px-5 py-3 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px]"
          style={{ color: 'var(--color-body)' }}
        >
          <span className="font-semibold" style={{ color: 'var(--color-heading)' }}>分类：</span>
          {categories.map((cat, idx) => {
            const isAll = idx === 0;
            const active = isAll ? !currentCategory : currentCategory === cat;
            const href = isAll ? "/" : "/?category=" + cat;

            return (
              <Link
                key={cat}
                href={href}
                className="cat-link"
                style={{
                  color: active ? 'var(--color-primary)' : 'var(--color-body)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {cat}
              </Link>
            );
          })}
        </div>

        {/* 文章列表容器 */}
        <div
          className="card px-2 md:px-0"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          {pagedPosts.length === 0 ? (
            <p
              className="text-center py-20 text-sm"
              style={{ color: 'var(--color-muted)' }}
            >
              暂无文章
            </p>
          ) : (
            pagedPosts.map((post) => (
              <div key={post.slug} className="px-4 md:px-6">
                {/* 每一个文章卡片组件 */}
                <PostCard post={post} />
              </div>
            ))
          )}
        </div>

        {/* 分页组件 */}
        {renderPagination()}
      </section>

      {/* ===== 右侧区域：个人简介侧边栏 (大屏显示) ===== */}
      <aside className="hidden lg:block">
        <div className="card p-6 sticky top-[100px] text-center">
          {/* 头像区 */}
          <div
            className="w-[90px] h-[90px] mx-auto rounded-full border-2 flex items-center justify-center text-[32px] font-light overflow-hidden"
            style={{
              backgroundColor: 'var(--color-tag-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-primary)',
              fontFamily: "Georgia, serif",
            }}
          >
            不
          </div>

          {/* 名称 */}
          <h3
            className="text-center mt-3 text-[16px] font-bold"
            style={{
              color: 'var(--color-heading)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            不赶
          </h3>

          {/* 职位描述 */}
          <p
            className="text-center mt-1 text-[12px] leading-tight"
            style={{ color: 'var(--color-muted)' }}
          >
            Blogger · 美食爱好者 · 慢生活
          </p>
          <p
            className="text-center mt-2 text-[12px] leading-relaxed italic"
            style={{ color: 'var(--color-muted)' }}
          >
            为食而生
          </p>

          {/* 社交链接图标 */}
          <div
            className="mt-4 flex items-center justify-center gap-3 text-[14px]"
            style={{ color: 'var(--color-muted)' }}
          >
            {/* 社交链接在此修改 */}
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="nav-icon text-[16px]">𝕏</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <a href="mailto:hi@bugan.com" className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </a>
            <a href="/feed.xml" className="nav-icon text-[13px] font-semibold">RSS</a>
          </div>

          {/* 数据统计区 */}
          <div
            className="mt-5 pt-4 border-t flex justify-around text-center text-[12px]"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div>
              <div className="font-bold text-[16px]" style={{ color: 'var(--color-heading)' }}>
                {allPosts.length}
              </div>
              <div style={{ color: 'var(--color-light)' }}>文章</div>
            </div>
            <div>
              <div className="font-bold text-[16px]" style={{ color: 'var(--color-heading)' }}>
                {categories.length - 1}
              </div>
              <div style={{ color: 'var(--color-light)' }}>分类</div>
            </div>
            <div>
              <div className="font-bold text-[16px]" style={{ color: 'var(--color-heading)' }}>
                0
              </div>
              <div style={{ color: 'var(--color-light)' }}>评论</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
