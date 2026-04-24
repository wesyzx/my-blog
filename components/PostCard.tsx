import Link from "next/link";
import Image from "next/image";
import { PostMeta } from "@/lib/posts";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
}

export default function PostCard({ post }: { post: PostMeta }) {
  const tags = post.tags.length > 0 ? post.tags : [post.category];

  return (
    <article
      className="py-5 flex flex-col md:flex-row gap-4"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <Link
        href={"/posts/" + post.slug}
        className="block group relative w-full md:w-[220px] lg:w-[230px] h-[120px] md:h-[132px] flex-shrink-0 overflow-hidden rounded-[4px]"
        style={{ backgroundColor: 'var(--color-tag-bg)' }}
      >
        {post.cover ? (
          <Image
            src={post.cover}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 230px"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-medium text-base px-4 text-center"
            style={{ color: 'var(--color-muted)' }}
          >
            {post.title}
          </div>
        )}
      </Link>

      <div className="flex-1 flex flex-col justify-center min-w-0">
        {/* 分类 */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="tag">{post.category}</span>
        </div>

        {/* 标题 */}
        <h2 className="text-[18px] md:text-[20px] font-bold mb-2 md:mb-3 leading-[1.35]" style={{ color: 'var(--color-heading)' }}>
          <Link
            href={"/posts/" + post.slug}
            className="hover:text-[var(--color-primary)] transition-colors line-clamp-2"
            style={{ color: 'inherit' }}
          >
            {post.title}
          </Link>
        </h2>

        {/* 元信息 */}
        <div
          className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold"
          style={{ color: 'var(--color-muted)' }}
        >
          <time>{formatDate(post.date)}</time>
          <span>/</span>
          <span>{tags.slice(0, 2).join(", ")}</span>
          <span>/</span>
          <Link
            href={"/posts/" + post.slug + "#comments"}
            className="hover:text-[var(--color-primary)] transition-colors"
            style={{ color: 'inherit' }}
          >
            添加评论
          </Link>
        </div>
      </div>
    </article>
  );
}
