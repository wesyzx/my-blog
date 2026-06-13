import { getMoreContentBySlug } from '@/lib/more';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
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
    <div className="max-w-[800px] mx-auto py-12 animate-fade-up">
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-[40px] grayscale opacity-80">{data.icon}</span>
          <h1 className="text-[32px] font-medium text-[var(--color-text-primary)]">{data.title}</h1>
        </div>
        <div className="border-l-4 border-[var(--color-accent)] pl-4 py-2 bg-[var(--color-bg-surface)] rounded-r-[var(--radius-sm)]">
          <p className="text-[15px] text-[var(--color-text-secondary)] italic">
            {data.desc}
          </p>
        </div>
      </header>

      <div className="card p-[30px] md:p-[45px]">
        <div
          className="prose max-w-none
            prose-p:text-[16px] prose-p:leading-[1.8]
            prose-strong:text-[var(--color-text-primary)]
            prose-a:text-[var(--color-accent)] prose-a:no-underline prose-a:border-b prose-a:border-dotted
            prose-hr:border-[var(--color-border)]
            prose-li:text-[15px] prose-li:leading-[1.8]
            prose-em:text-[var(--color-text-muted)]
            prose-h2:text-[22px] prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-[18px] prose-h3:mt-6 prose-h3:mb-3
          "
        >
          <MDXRemote source={data.content} />
        </div>
      </div>
    </div>
  );
}
