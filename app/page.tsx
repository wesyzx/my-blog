import { getAllPosts, getAllCategories } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import Link from "next/link";

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
      {/* ===== 文章列表 ===== */}
      <section>
        {/* 分类筛选 */}
        <div
          className="card px-5 py-3 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px]"
          style={{ color: 'var(--color-body)' }}
        >
          <span className="font-semibold" style={{ color: 'var(--color-heading)' }}>分类：</span>
          {categories.map((cat, idx) => {
            const isAll = idx === 0;
            const active = isAll ? !current : current === cat;
            const href = isAll ? "/" : "/?category=" + cat;

            return (
              <a
                key={cat}
                href={href}
                className={"cat-link" + (active ? "" : "")}
                style={{
                  color: active ? 'var(--color-primary)' : 'var(--color-body)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {cat}
              </a>
            );
          })}
        </div>

        {/* 文章列表 */}
        <div
          className="card px-2 md:px-0"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          {filtered.length === 0 ? (
            <p
              className="text-center py-20 text-sm"
              style={{ color: 'var(--color-muted)' }}
            >
              暂无文章
            </p>
          ) : (
            filtered.map((post) => (
              <div key={post.slug} className="px-4 md:px-6">
                <PostCard post={post} />
              </div>
            ))
          )}
        </div>

        {/* 分页 */}
        <div
          className="mt-5 flex items-center justify-center gap-2 text-[15px] font-medium"
          style={{ color: 'var(--color-heading)' }}
        >
          <span
            className="w-10 h-10 flex items-center justify-center rounded-[3px] text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            1
          </span>
          {[2, 3].map((n) => (
            <span
              key={n}
              className="w-10 h-10 flex items-center justify-center rounded-[3px] cursor-pointer transition-colors hover:text-[var(--color-primary)]"
            >
              {n}
            </span>
          ))}
          <span className="px-1" style={{ color: 'var(--color-muted)' }}>…</span>
          <span className="w-10 h-10 flex items-center justify-center rounded-[3px] cursor-pointer transition-colors hover:text-[var(--color-primary)]">
            16
          </span>
          <span className="px-3 h-10 flex items-center justify-center rounded-[3px] cursor-pointer transition-colors hover:text-[var(--color-primary)]">
            下一个
          </span>
        </div>
      </section>

      {/* ===== 侧边栏 ===== */}
      <aside className="hidden lg:block">
        <div className="card p-6 sticky top-[100px] text-center">
          {/* 头像 */}
          <div
            className="w-[90px] h-[90px] mx-auto rounded-full border-2 flex items-center justify-center text-[32px] font-light"
            style={{
              backgroundColor: 'var(--color-tag-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-light)',
            }}
          >
            C
          </div>

          {/* 名称 */}
          <h3 className="text-center mt-3 text-[16px] font-bold" style={{ color: 'var(--color-heading)' }}>
            Can Chou
          </h3>

          {/* 描述 */}
          <p
            className="text-center mt-1 text-[12px] leading-tight"
            style={{ color: 'var(--color-muted)' }}
          >
            Blogger | 摄影爱好者 | 字典官
          </p>
          <p
            className="text-center mt-2 text-[12px] leading-relaxed"
            style={{ color: 'var(--color-muted)' }}
          >
            不慌不忙，记录生活
          </p>

          {/* 社交图标 */}
          <div
            className="mt-4 flex items-center justify-center gap-3 text-[14px]"
            style={{ color: 'var(--color-muted)' }}
          >
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="nav-icon text-[16px]">𝕏</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <a href="mailto:hi@example.com" className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </a>
            <a href="/feed.xml" className="nav-icon text-[13px] font-semibold">RSS</a>
          </div>

          {/* 统计信息 */}
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
