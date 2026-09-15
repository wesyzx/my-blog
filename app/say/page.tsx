import Image from 'next/image'
import { getAllSays } from '@/lib/say'
import SayCommentsToggle from '@/components/SayCommentsToggle'
import SafeMarkdown from '@/components/SafeMarkdown'
import Icon from '@/components/Icon'

export const metadata = { title: '说说', description: '零碎的思考、瞬间的感悟，以及生活的日常。' }
const AUTHOR_AVATAR = 'https://images.guanyan.me/%E7%BD%90%E5%A4%B4%E5%91%A8.png'

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? '时间待定' : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

export default async function SayPage() {
  const says = await getAllSays()
  return <div className="page-shell narrow animate-fade-up">
    <header className="page-header"><div className="page-header-row"><span className="page-icon"><Icon name="say" /></span><h1 className="page-title">说说</h1></div><p className="page-lead">零碎的思考、瞬间的感悟，以及生活的日常。</p></header>
    {says.length === 0 ? <div className="empty-state">暂时没有可显示的说说。</div> : <div className="say-timeline">
      {says.map((say) => <article key={say.slug} className="say-item">
        <div className="say-author"><Image src={AUTHOR_AVATAR} alt="Can Chou" width={42} height={42} /><div><strong>Can Chou</strong><time>{formatDate(say.date)}</time></div></div>
        <SafeMarkdown source={say.content} />
        {say.images && say.images.length > 0 && <div className={`say-images count-${Math.min(say.images.length, 3)}`}>{say.images.map((src, index) => <a href={src} target="_blank" rel="noopener noreferrer" key={src}><Image src={src} alt={`说说配图 ${index + 1}`} width={720} height={720} sizes="(max-width: 760px) 50vw, 240px" /></a>)}</div>}
        <SayCommentsToggle pageKey={`/say/${say.slug}`} pageTitle={`说说 ${formatDate(say.date)}`} />
      </article>)}
    </div>}
  </div>
}
