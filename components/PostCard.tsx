import Link from "next/link";
import { PostMeta } from "@/lib/posts";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
}

export default function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link href={"/posts/" + post.slug} className="group block py-5 border-b border-gray-100 transition-colors">
      <article>
        <div className="flex items-baseline flex-wrap gap-2 md:gap-3 mb-1.5">
          <span className="text-sm font-medium text-gray-500 whitespace-nowrap">{post.category}</span>
          <h2 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
            {post.title}
          </h2>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <time>{formatDate(post.date)}</time>
          <span className="hidden md:inline">日常</span> {/* 模拟标签 */}
          <span>0 评论</span>
        </div>
      </article>
    </Link>
  );
}
