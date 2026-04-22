import Link from "next/link";
import Image from "next/image";
import { PostMeta } from "@/lib/posts";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
}

export default function PostCard({ post }: { post: PostMeta }) {
  return (
    <article className="bg-white rounded-[5px] overflow-hidden mb-[30px] border border-[rgba(223,228,235,0.8)] shadow-[0px_12px_18px_-6px_rgba(34,56,101,0.04)] flex flex-col md:flex-row">
      <Link href={"/posts/" + post.slug} className="block group relative w-full md:w-[45%] lg:w-[40%] flex-shrink-0 aspect-[2/1] md:aspect-auto overflow-hidden bg-gray-100">
        {post.cover ? (
          <Image
            src={post.cover}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#475671] bg-[#f3f4f7] font-medium text-xl">
            {post.title}
          </div>
        )}
      </Link>
      
      <div className="p-6 md:p-[30px] flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-3">
          <svg width="13" height="13" viewBox="0 0 15 15" className="fill-[#475671]">
            <path d="M14.4,1.2H0.6C0.3,1.2,0,1.5,0,1.9V5c0,0.3,0.3,0.6,0.6,0.6h0.6v7.5c0,0.3,0.3,0.6,0.6,0.6h11.2c0.3,0,0.6-0.3,0.6-0.6V5.6h0.6C14.7,5.6,15,5.3,15,5V1.9C15,1.5,14.7,1.2,14.4,1.2z M12.5,12.5h-10V5.6h10V12.5z M13.8,4.4H1.2V2.5h12.5V4.4z M5.6,7.5c0-0.3,0.3-0.6,0.6-0.6h2.5c0.3,0,0.6,0.3,0.6,0.6S9.1,8.1,8.8,8.1H6.2C5.9,8.1,5.6,7.8,5.6,7.5z"/>
          </svg>
          <span className="text-[12px] font-semibold text-[#475671] uppercase tracking-wide">{post.category}</span>
        </div>
        
        <h2 className="text-[20px] font-bold text-[#293241] mb-[15px] leading-[1.3]">
          <Link href={"/posts/" + post.slug} className="hover:text-[#98c1d9] transition-colors line-clamp-2">
            {post.title}
          </Link>
        </h2>
        
        <div className="flex items-center flex-wrap gap-x-[15px] gap-y-2 text-[12px] font-semibold text-[#475671] uppercase mt-auto pt-2">
          <time>{formatDate(post.date)}</time>
          <div className="flex items-center gap-1">
            <span className="hover:text-[#98c1d9] transition-colors cursor-pointer">日常</span>
          </div>
          <Link href={"/posts/" + post.slug} className="hover:text-[#98c1d9] transition-colors">
            0 评论
          </Link>
        </div>
      </div>
    </article>
  );
}
