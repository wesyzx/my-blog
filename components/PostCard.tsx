/**
 * 文章卡片组件
 *
 * 参考极简设计风格：
 * - 无边框卡片，靠间距分隔
 * - 圆角封面图
 * - 优雅的字体重和排版层次
 * - 日期 + 标题 + 摘要
 */
import Link from "next/link";
import Image from "next/image";
import { PostMeta } from "@/lib/posts";

/** 格式化日期：YYYY / MM / DD */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year} / ${month} / ${day}`;
}

export default function PostCard({ post }: { post: PostMeta }) {
  return (
    <article className="group">
      {/* 封面图 */}
      <Link
        href={"/posts/" + post.slug}
        className="block relative aspect-[16/10] w-full overflow-hidden rounded-lg mb-4"
        style={{ backgroundColor: 'var(--color-bg-surface)' }}
      >
        {post.cover ? (
          <Image
            src={post.cover}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="subtitle-en opacity-15 text-[20px] tracking-widest">
              THE UNHURRIED
            </span>
          </div>
        )}
      </Link>

      {/* 文字信息区 */}
      <div className="px-0.5">
        {/* 日期 + 分类 */}
        <div className="flex items-center gap-3 mb-2.5">
          <time
            className="text-[13px] tracking-wide"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {formatDate(post.date)}
          </time>
          <span
            className="text-[10px] font-medium tracking-[0.08em] px-2 py-0.5 rounded-full border"
            style={{
              color: 'var(--color-accent)',
              borderColor: 'var(--color-accent)',
              opacity: 0.7,
            }}
          >
            {post.category}
          </span>
        </div>

        {/* 标题 */}
        <h2 className="text-[17px] font-semibold leading-[1.5] mb-2">
          <Link
            href={"/posts/" + post.slug}
            className="hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {post.title}
          </Link>
        </h2>

        {/* 摘要 */}
        {post.excerpt && (
          <p
            className="text-[14px] leading-[1.7] line-clamp-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {post.excerpt}
          </p>
        )}
      </div>
    </article>
  );
}
