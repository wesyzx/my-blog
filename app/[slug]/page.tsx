import { notFound } from 'next/navigation'

const pageMap: Record<string, { title: string; description: string }> = {
  say: { title: '说说', description: '记录最近的只言片语和瞬间想法。' },
  more: { title: '更多', description: '这里是抽屉页，收纳所有不止于博客的内容。' },
  'library-movie': { title: '书影音', description: '读过的书、看过的电影与听过的音乐。' },
  share: { title: '好东西', description: '整理那些真正在用、值得推荐的工具和产品。' },
  friendlink: { title: '小伙伴', description: '记录一路同行的朋友和他们的作品。' },
  map: { title: '人生地图', description: '把去过、想去、想再去的地方做成一张生活地图。' },
  support_me: { title: '支持我', description: '如果你喜欢这里的内容，可以请我喝杯咖啡。' },
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
    <section className="bg-white rounded-[5px] p-[30px] shadow-[0px_12px_18px_-6px_rgba(34,56,101,0.04)]">
      <h1 className="text-[30px] font-bold mb-4 text-[#293241]">{page.title}</h1>
      <p className="text-[16px] text-[#475671] leading-[1.7]">{page.description}</p>
      <div className="mt-8 border-t border-[#e7e9ef] pt-6 text-[14px] text-[#475671]">
        页面已就绪，后续可在这里继续补充完整内容模块。
      </div>
    </section>
  )
}
