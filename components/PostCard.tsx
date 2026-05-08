import Link from "next/link";
import Image from "next/image";
import { PostMeta } from "@/lib/posts";

/**
 * 格式化日期：YYYY.MM.DD
 */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export default function PostCard({ post }: { post: PostMeta }) {
  return (
    <article className="card post-card group h-full flex flex-col">
      {/* 封面图 (16:9 比例) */}
      <Link
        href={"/posts/" + post.slug}
        className="block relative aspect-video w-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-surface)' }}
      >
        {post.cover ? (
          <Image
            src={post.cover}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-6 text-center">
             <span className="subtitle-en opacity-20 text-[24px]">THE UNHURRIED</span>
          </div>
        )}
      </Link>

      {/* 卡片内容区 */}
      <div className="flex-1 flex flex-col p-5">
        {/* 分类标签 */}
        <div className="mb-2">
          <span className="tag-category">{post.category}</span>
        </div>

        {/* 文章标题 */}
        <h2 className="text-[15px] font-medium leading-relaxed mb-3 flex-1 line-clamp-2">
          <Link
            href={"/posts/" + post.slug}
            className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors"
          >
            {post.title}
          </Link>
        </h2>

        {/* 元信息：日期 */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-4 text-[12px] text-[var(--color-text-muted)]">
            <time>{formatDate(post.date)}</time>
          </div>
          
          {/* 阅读更多入口 */}
          <Link 
            href={"/posts/" + post.slug}
            className="text-[11px] font-bold tracking-widest text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            READ MORE →
          </Link>
        </div>
      </div>
    </article>
  );
}
