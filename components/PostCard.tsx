/**
 * 文章卡片组件 - 卡片式预览图风格
 *
 * 像素级参考 veryjack.com 的 Boxed 卡片设计：
 * - 顶部为 2:1 比例封面预览图（带 hover 缩放效果）
 * - 底部 card-content 结构：
 *   1. 上方 Meta：📂 分类名称
 *   2. 标题：粗体，限制最大 2 行
 *   3. 下方 Meta：日期 / 标签（斜杠 / 分割）
 *   4. 底部有一条微小的装饰性分割线
 * - 移除摘要（Excerpt），保持高度整齐与排版呼吸感
 */
import Link from "next/link";
import { PostMeta } from "@/lib/posts";

/** 格式化日期：YYYY年MM月DD日 */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}年${month}月${day}日`;
}

export default function PostCard({ post }: { post: PostMeta }) {
  return (
    <article className="group flex flex-col md:flex-row bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-[var(--color-border-hover)] hover:-translate-y-0.5 transition-all duration-300 h-full">
      {/* 封面预览图 */}
      <Link href={"/posts/" + post.slug} className="block w-full md:w-[38%] shrink-0 aspect-[2/1] md:aspect-auto overflow-hidden bg-[var(--color-bg-surface)] relative">
        {post.cover ? (
          <img
            src={post.cover}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          /* 无封面图时，使用雅致的渐变色配合 icon */
          <div className="w-full h-full bg-gradient-to-br from-amber-50/50 to-orange-100/50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-[36px] opacity-70 group-hover:scale-105 transition-transform duration-500">
            ✍️
          </div>
        )}
      </Link>

      {/* 卡片内容区 */}
      <div className="p-6 flex flex-col flex-1 min-w-0">
        {/* 上部 Meta：分类 */}
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-accent)] mb-2.5">
          <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.4 1.2H0.6C0.3 1.2 0 1.5 0 1.9V5C0 5.3 0.3 5.6 0.6 5.6H1.2V13.1C1.2 13.4 1.5 13.7 1.8 13.7H13.2C13.5 13.7 13.8 13.4 13.8 13.1V5.6H14.4C14.7 5.6 15 5.3 15 5V1.9C15 1.5 14.7 1.2 14.4 1.2ZM12.5 12.5H2.5V5.6H12.5V12.5ZM13.8 4.4H1.2V2.5H13.8V4.4Z" fill="currentColor"/>
          </svg>
          <Link
            href={`/?category=${post.category}`}
            className="hover:underline"
          >
            {post.category}
          </Link>
        </div>

        {/* 标题 */}
        <h2 className="text-[17px] md:text-[18px] font-bold leading-snug mb-3">
          <Link
            href={"/posts/" + post.slug}
            className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 line-clamp-2"
          >
            {post.title}
          </Link>
        </h2>

        {/* 下部 Meta：日期 / 标签 */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--color-text-muted)] font-serif italic mt-auto">
          <time>{formatDate(post.date)}</time>
          {post.tags && post.tags.length > 0 && (
            <>
              <span className="text-[var(--color-border-hover)]">/</span>
              <span className="space-x-1.5">
                {post.tags.map((tag, i) => (
                  <span key={tag} className="hover:text-[var(--color-accent)] transition-colors duration-200">
                    #{tag}
                    {i < post.tags.length - 1 && <span className="text-[var(--color-border-hover)] ml-1.5">,</span>}
                  </span>
                ))}
              </span>
            </>
          )}
        </div>

        {/* 底部装饰线 */}
        <div className="h-[1px] w-6 bg-[var(--color-border)] mt-5 group-hover:w-12 group-hover:bg-[var(--color-accent)] transition-all duration-300"></div>
      </div>
    </article>
  );
}
