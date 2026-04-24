import { notFound } from 'next/navigation'

const pageMap: Record<string, { title: string; description: string; emoji?: string }> = {
  more: { title: '更多', description: '收纳所有不止于博客的内容。', emoji: '📦' },
  'library-movie': { title: '书影音', description: '读过的书、看过的电影与听过的音乐。', emoji: '📚' },
  share: { title: '好东西', description: '整理那些真正在用、值得推荐的工具和产品。', emoji: '✨' },
  friendlink: { title: '小伙伴', description: '记录一路同行的朋友和他们的作品。', emoji: '🤝' },
  map: { title: '人生地图', description: '把去过、想去、想再去的地方做成一张生活地图。', emoji: '🗺' },
  support_me: { title: '支持我', description: '如果你喜欢这里的内容，可以请我喝杯咖啡。', emoji: '☕' },
}

export default async function GenericPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = pageMap[slug]

  if (!page) {
    notFound()
  }

  return (
    <div className="max-w-[800px] mx-auto">
      <div
        className="card p-[30px] md:p-[40px]"
      >
        <div className="flex items-center gap-4 mb-6">
          <span className="text-[36px]">{page.emoji}</span>
          <div>
            <h1 className="text-[30px] font-bold" style={{ color: 'var(--color-heading)' }}>
              {page.title}
            </h1>
            <p className="text-[14px] mt-1" style={{ color: 'var(--color-muted)' }}>
              {page.description}
            </p>
          </div>
        </div>

        <hr className="divider" />

        <div
          className="mt-6 pt-4 text-[14px] leading-relaxed"
          style={{ color: 'var(--color-muted)' }}
        >
          页面已就绪，后续可在这里继续补充完整内容模块。
        </div>
      </div>
    </div>
  )
}
