import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '抽屉',
  description: '莫赶的数字抽屉',
};

const drawerItems = [
  { title: '好物', desc: '买过觉得不错的东西', icon: '🛍️', href: '/more/goods' },
  { title: '应用', desc: '常用的软件和工具', icon: '📱', href: '/more/apps' },
  { title: '书影音', desc: '看过的书、电影和听过的歌', icon: '🎬', href: '/more/media' },
  { title: '友情链接', desc: '经常串门的朋友们', icon: '🤝', href: '/more/friends' },
  { title: '愿望清单', desc: '那些想买或想做的事', icon: '🎁', href: '/more/wishlist' },
  { title: '人生地图', desc: '去过的地方，走过的路', icon: '🗺️', href: '/more/map' },
];

export default function MorePage() {
  return (
    <div className="max-w-[720px] mx-auto px-6 py-12 md:py-20 animate-fade-up">
      <header className="mb-16">
        <h1
          className="text-[32px] md:text-[40px] font-bold mb-4 text-[var(--color-text-primary)]"
          style={{ fontFamily: "Georgia, 'Noto Serif SC', serif" }}
        >
          抽屉
        </h1>
        <p className="text-[15px] text-[var(--color-text-muted)]">
          数字抽屉，存放一些零碎的喜好与记录。
        </p>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {drawerItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group flex items-start gap-5 p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-accent)] transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <div className="text-[32px] mt-1 group-hover:scale-110 transition-transform duration-300 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100">
              {item.icon}
            </div>
            <div>
              <h2 className="text-[18px] font-medium text-[var(--color-text-primary)] mb-1 group-hover:text-[var(--color-accent)] transition-colors">
                {item.title}
              </h2>
              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                {item.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
