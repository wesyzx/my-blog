import { getDoubanInterests } from '@/lib/douban';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '书影音',
  description: '近期看过的书、电影和听过的歌',
};

// 豆瓣 ID，用户可以自行替换
const DOUBAN_ID = 'ahshq'; 

export default async function MediaPage() {
  const items = await getDoubanInterests(DOUBAN_ID);

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12 md:py-20 animate-fade-up">
      <header className="mb-16">
        <h1
          className="text-[32px] md:text-[40px] font-bold mb-4"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          书影音
        </h1>
        <p className="text-[15px] text-[var(--color-text-muted)]">
          精神食粮，定期补给。同步自豆瓣 (ID: {DOUBAN_ID}) 的近期动态。
        </p>
      </header>

      {items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[var(--color-border)] rounded-xl">
          <p className="text-[var(--color-text-muted)]">
            暂无动态，或由于网络原因未能拉取到豆瓣数据。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-3"
            >
              <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-sm border border-[var(--color-border)] group-hover:shadow-md group-hover:border-[var(--color-accent)] transition-all duration-300 bg-[var(--color-bg-surface)]">
                {item.cover ? (
                  <Image
                    src={item.cover}
                    alt={item.title}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--color-text-hint)] text-[12px]">
                    No Cover
                  </div>
                )}
                
                {/* 类别标签 */}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium tracking-wider">
                  {item.action}
                </div>
              </div>

              <div>
                <h3 className="text-[14px] font-bold text-[var(--color-text-primary)] line-clamp-1 group-hover:text-[var(--color-accent)] transition-colors">
                  {item.title}
                </h3>
                {item.rating && (
                  <div className="text-[12px] text-[#f5a623] mt-0.5">
                    {item.rating}
                  </div>
                )}
                <div className="text-[12px] text-[var(--color-text-hint)] mt-1 font-serif italic">
                  {(() => {
                    const d = new Date(item.date);
                    return isNaN(d.getTime()) ? '未知日期' : d.toLocaleDateString('zh-CN');
                  })()}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
