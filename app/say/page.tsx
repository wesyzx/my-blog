import Image from 'next/image'
import { getAllSays } from '@/lib/say'
import SayCommentsToggle from '@/components/SayCommentsToggle'
import SafeMarkdown from '@/components/SafeMarkdown'
import { createPageMetadata } from '@/lib/metadata'

export const metadata = createPageMetadata({ title: '短记', description: '零碎的思考、瞬间的感悟，以及生活的日常。', path: '/say' })

// 短记必须跟着 Memos 实时变。原先这里是静态页 + 60 秒 ISR，而 Next 给 ISR 页发的响应头是
// `s-maxage=60, stale-while-revalidate=31535940`（默认 expire 是一整年）——
// 缓存过期后仍然先返回旧内容、后台再刷新，所以新增要等一会儿、删除更要刷新两次才消失。
// 改成每次请求都重新渲染，发出去的响应头变成 no-store，CDN 不再缓存。
export const dynamic = 'force-dynamic'
const AUTHOR_AVATAR = 'https://img.guanyan.me/2026/05/fa7d85a90137299c295a3cdbe9790395.png'

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? '时间待定' : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

export default async function SayPage() {
  const says = await getAllSays()
  return (
    <div className="page-shell narrow animate-fade-up">
      <header className="page-header">
        <div className="page-header-meta editorial-meta">FRAGMENTS / 随笔微语</div>
        <h1 className="page-title">短记</h1>
        <p className="page-lead">零碎的思考、瞬间的感悟，以及生活的日常。</p>
      </header>

      {says.length === 0 ? (
        <div className="empty-state">暂时没有可显示的短记。</div>
      ) : (
        <div className="say-timeline">
          {says.map((say) => (
            <article key={say.slug} id={`say-${encodeURIComponent(say.slug)}`} className="say-item">
              <div className="say-author">
                <Image
                  src={AUTHOR_AVATAR}
                  alt="Can Chou"
                  width={40}
                  height={40}
                  className="say-avatar"
                />
                <div className="say-author-info">
                  <strong>Can Chou</strong>
                  <time dateTime={say.date}>{formatDate(say.date)}</time>
                </div>
              </div>

              <div className="say-content">
                <SafeMarkdown source={say.content} />
              </div>

              {say.images && say.images.length > 0 && (
                <div className={`say-images count-${Math.min(say.images.length, 3)}`}>
                  {say.images.map((src, index) => (
                    <a href={src} target="_blank" rel="noopener noreferrer" key={src}>
                      <Image
                        src={src}
                        alt={`短记配图 ${index + 1}`}
                        width={720}
                        height={720}
                        sizes="(max-width: 760px) 50vw, 240px"
                      />
                    </a>
                  ))}
                </div>
              )}

              <SayCommentsToggle pageKey={`/say/${say.slug}`} pageTitle={`短记 ${formatDate(say.date)}`} />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
