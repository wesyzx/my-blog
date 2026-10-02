import Image from 'next/image'
import Link from 'next/link'
import { getAllSays } from '@/lib/say'
import ClickableNoteContent from '@/components/ClickableNoteContent'
import ImageLightbox from '@/components/ImageLightbox'
import { createPageMetadata } from '@/lib/metadata'
import { formatItemDate } from '@/lib/format'
import PageHeader from '@/components/PageHeader'

export const metadata = createPageMetadata({ title: '短记', description: '零碎的思考、瞬间的感悟，以及生活的日常。', path: '/say' })

// 短记必须跟着 Memos 实时变。原先这里是静态页 + 60 秒 ISR，而 Next 给 ISR 页发的响应头是
// `s-maxage=60, stale-while-revalidate=31535940`（默认 expire 是一整年）——
// 缓存过期后仍然先返回旧内容、后台再刷新，所以新增要等一会儿、删除更要刷新两次才消失。
// 改成每次请求都重新渲染，发出去的响应头变成 no-store，CDN 不再缓存。
export const dynamic = 'force-dynamic'

export default async function SayPage() {
  const says = await getAllSays()
  return (
    <div className="page-shell narrow animate-fade-up">
      <PageHeader title="短记" />

      {says.length === 0 ? (
        <div className="empty-state">暂时没有可显示的短记。</div>
      ) : (
        <div className="note-list">
          {says.map((say) => {
            const href = `/say/${encodeURIComponent(say.slug)}`
            return (
              <article key={say.slug} id={`say-${encodeURIComponent(say.slug)}`} className="note-item">
                <Link href={href} className="note-date-link" aria-label={`查看 ${formatItemDate(say.date)} 的短记`}>
                  <time className="item-time" dateTime={say.date}>{formatItemDate(say.date)}</time>
                </Link>

                <ClickableNoteContent source={say.content} href={href} />

                {/* 同一则短记的多张图组成一组，点开即灯箱；data-lightbox-src 让灯箱拿原图而不是缩略图 */}
                {say.images && say.images.length > 0 && (
                  <ImageLightbox className={`say-images count-${Math.min(say.images.length, 3)}`}>
                    {say.images.map((src, index) => (
                      <a href={src} target="_blank" rel="noopener noreferrer" key={src}>
                        <Image
                          src={src}
                          alt={`短记配图 ${index + 1}`}
                          width={720}
                          height={720}
                          sizes="(max-width: 760px) 50vw, 240px"
                          data-lightbox-src={src}
                        />
                      </a>
                    ))}
                  </ImageLightbox>
                )}

              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
