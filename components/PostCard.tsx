/**
 * 文章卡片组件 - 极简纯文字风格
 *
 * 参考 veryjack.com 设计：
 * - 移除图片，专注排版
 * - 标题居上，字号加大
 * - 日期与分类作为元信息紧随其后
 * - 摘要保持简洁
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
    <article className="group py-8 first:pt-0 border-b border-[var(--color-border)] last:border-0">
      {/* 分类标签 */}
      <div className="mb-3">
        <Link
          href={`/?category=${post.category}`}
          className="text-[12px] font-medium tracking-wider text-[var(--color-accent)] hover:underline opacity-80"
        >
          {post.category}
        </Link>
      </div>

      {/* 标题 */}
      <h2 className="text-[22px] md:text-[24px] font-bold leading-tight mb-3">
        <Link
          href={"/posts/" + post.slug}
          className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300"
        >
          {post.title}
        </Link>
      </h2>

      {/* 元信息：日期 */}
      <div className="flex items-center gap-4 mb-4 text-[var(--color-text-muted)] text-[13px]">
        <time>{formatDate(post.date)}</time>
      </div>

      {/* 摘要 */}
      {post.excerpt && (
        <p
          className="text-[15px] leading-[1.8] text-[var(--color-text-secondary)] line-clamp-3"
        >
          {post.excerpt}
        </p>
      )}
    </article>
  );
}
