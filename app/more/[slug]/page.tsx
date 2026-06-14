import { getMoreContentBySlug, getAllMoreSlugs } from '@/lib/more';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllMoreSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = getMoreContentBySlug(slug);
  if (!data) return { title: 'Not Found' };
  return {
    title: data.title,
    description: data.desc,
  };
}

export default async function MoreDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = getMoreContentBySlug(slug);

  if (!data) {
    notFound();
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 py-12 md:py-20 animate-fade-up">
      <header className="mb-16">
        <div className="mb-4">
          <span className="text-[14px] font-medium tracking-wider text-[var(--color-accent)] opacity-80">{data.icon} 抽屉 / {data.title}</span>
        </div>
        <h1
          className="text-[32px] md:text-[40px] font-bold mb-4 text-[var(--color-text-primary)]"
          style={{ fontFamily: "Georgia, 'Noto Serif SC', serif" }}
        >
          {data.title}
        </h1>
        <p className="text-[15px] text-[var(--color-text-muted)] italic">
          {data.desc}
        </p>
      </header>

      <div className="prose max-w-none
        prose-p:text-[16px] prose-p:leading-[1.85] prose-p:text-[var(--color-text-secondary)]
        prose-strong:text-[var(--color-text-primary)]
        prose-a:text-[var(--color-accent)] prose-a:no-underline prose-a:border-b prose-a:border-dotted
        prose-img:rounded-xl
        prose-blockquote:border-l-[3px] prose-blockquote:border-[var(--color-accent)] prose-blockquote:bg-[var(--color-bg-surface)] prose-blockquote:px-6 prose-blockquote:py-2 prose-blockquote:rounded-r-lg
        prose-li:text-[16px] prose-li:leading-[1.8]
      ">
        <MDXRemote source={data.content} />
      </div>
    </div>
  );
}
