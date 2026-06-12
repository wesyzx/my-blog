import { getDoubanInterests } from '@/lib/douban';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '书影音',
  description: '近期看过的书、电影和听过的歌',
};

// 豆瓣 ID，用户可以自行替换
const DOUBAN_ID = 'ahshq'; // 使用占位符，可修改为真实的豆瓣ID

export default async function MediaPage() {
  const items = await getDoubanInterests(DOUBAN_ID);

  return (
    <div className="max-w-[900px] mx-auto py-12 animate-fade-up">
      <header className="mb-12">
        <h1 className="text-[32px] font-medium mb-6 text-[var(--color-text-primary)]">书影音</h1>
        <div className="border-l-4 border-[var(--color-accent)] pl-4 py-2 bg-[var(--color-bg-surface)] rounded-r-[var(--radius-sm)] mb-4">
          <p className="text-[15px] text-[var(--color-text-secondary)] italic">
            精神食粮，定期补给。
          </p>
        </div>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          同步自豆瓣 (ID: {DOUBAN_ID}) 的近期动态
        </p>
      </header>

      {items.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          暂无动态，或由于网络原因未能拉取到豆瓣数据。
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-3"
            >
              <div className="relative aspect-[2/3] w-full rounded-[var(--radius-md)] overflow-hidden shadow-sm border border-[var(--color-border)] group-hover:shadow-md group-hover:border-[var(--color-accent)] transition-all duration-300">
                {item.cover ? (
                  /* 使用 unoptimized 绕过 next/image 对外部未配置域名的限制 */
                  <Image
                    src={item.cover}
                    alt={item.title}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-[var(--color-bg-surface)] flex items-center justify-center text-[var(--color-text-muted)]">
                    No Cover
                  </div>
                )}
                
                {/* 右上角类别标签 */}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-[var(--radius-sm)] bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium tracking-wider">
                  {item.action}
                </div>
              </div>

              <div>
                <h3 className="text-[14px] font-medium text-[var(--color-text-primary)] line-clamp-1 group-hover:text-[var(--color-accent)] transition-colors">
                  {item.title}
                </h3>
                {item.rating && (
                  <div className="text-[12px] text-[#f5a623] mt-1">
                    {item.rating}
                  </div>
                )}
                <div className="text-[12px] text-[var(--color-text-muted)] mt-1">
                  {new Date(item.date).toLocaleDateString('zh-CN')}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
