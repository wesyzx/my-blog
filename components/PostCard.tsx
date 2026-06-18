/**
 * 文章卡片组件 - 卡片式预览图风格
 *
 * 参考 veryjack.com Boxed 风格设计：
 * - 顶部显示文章封面预览图（带悬停缩放效果）
 * - 底部展示分类、标题、日期和摘要
 * - 悬停时卡片整体微移并提升阴影
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
    <article className="group flex flex-col bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--color-border-hover)] hover:-translate-y-1 transition-all duration-300 h-full">
      {/* 封面预览图 */}
      <Link href={"/posts/" + post.slug} className="block aspect-[2/1] overflow-hidden bg-[var(--color-bg-surface)] relative">
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

      {/* 卡片文字内容 */}
      <div className="p-6 flex flex-col flex-1">
        {/* 分类标签 */}
        <div className="mb-3">
          <Link
            href={`/?category=${post.category}`}
            className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-accent)] bg-[var(--color-accent-light)] px-2.5 py-1 rounded-md"
          >
            {post.category}
          </Link>
        </div>

        {/* 标题 */}
        <h2 className="text-[18px] md:text-[20px] font-bold leading-snug mb-3">
          <Link
            href={"/posts/" + post.slug}
            className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300"
          >
            {post.title}
          </Link>
        </h2>

        {/* 摘要 */}
        {post.excerpt && (
          <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)] line-clamp-3 mb-4">
            {post.excerpt}
          </p>
        )}

        {/* 底部日期与阅读更多 */}
        <div className="mt-auto pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-[12px] text-[var(--color-text-muted)]">
          <time>{formatDate(post.date)}</time>
          <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-[var(--color-accent)] font-medium">
            阅读全文 →
          </span>
        </div>
      </div>
    </article>
  );
}
