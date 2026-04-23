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
    <article className="py-6 border-b border-[rgba(224,229,235,0.8)] flex flex-col md:flex-row gap-5 bg-white rounded-[5px] mb-4 card-shadow overflow-hidden hover:shadow-[0_12px_24px_-6px_rgba(34,56,101,0.08)] transition-shadow duration-300">
      <Link href={"/posts/" + post.slug} className="block group relative w-full md:w-[220px] lg:w-[230px] h-[140px] md:h-[132px] flex-shrink-0 overflow-hidden bg-[#f3f4f7]">
        {post.cover ? (
          <Image
            src={post.cover}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 230px"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#475671] bg-gradient-to-br from-[#f3f4f7] to-[#e7e9ef] font-medium text-base px-4 text-center">
            {post.title}
          </div>
        )}
      </Link>

      <div className="flex-1 flex flex-col justify-center min-w-0 px-4 md:px-0">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f3f4f7] rounded-[3px]">
            <svg width="12" height="12" viewBox="0 0 15 15" className="fill-[#98c1d9]">
              <path d="M14.4,1.2H0.6C0.3,1.2,0,1.5,0,1.9V5c0,0.3,0.3,0.6,0.6,0.6h0.6v7.5c0,0.3,0.3,0.6,0.6,0.6h11.2c0.3,0,0.6-0.3,0.6-0.6V5.6h0.6C14.7,5.6,15,5.3,15,5V1.9C15,1.5,14.7,1.2,14.4,1.2z M12.5,12.5h-10V5.6h10V12.5z M13.8,4.4H1.2V2.5h12.5V4.4z M5.6,7.5c0-0.3,0.3-0.6,0.6-0.6h2.5c0.3,0,0.6,0.3,0.6,0.6S9.1,8.1,8.8,8.1H6.2C5.9,8.1,5.6,7.8,5.6,7.5z"/>
            </svg>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475671]">{post.category}</span>
          </span>
        </div>

        <h2 className="text-[18px] md:text-[20px] font-bold text-[#293241] mb-2.5 leading-[1.35] line-clamp-2">
          <Link href={"/posts/" + post.slug} className="hover:text-[#98c1d9] transition-colors">
            {post.title}
          </Link>
        </h2>

        <p className="text-[13px] text-[#475671] leading-relaxed mb-3 line-clamp-2 hidden md:block">
          {post.excerpt || '点击阅读更多精彩内容...'}
        </p>

        <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-semibold text-[#616d80] mt-auto pt-2">
          <time className="flex items-center gap-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {formatDate(post.date)}
          </time>
          <span className="text-[#e7e9ef]">|</span>
          <span className="flex items-center gap-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            阿杰 Jack
          </span>
          <span className="text-[#e7e9ef]">|</span>
          <Link href={"/posts/" + post.slug} className="hover:text-[#98c1d9] transition-colors flex items-center gap-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            0 评论
          </Link>
        </div>
      </div>
    </article>
  );
}
