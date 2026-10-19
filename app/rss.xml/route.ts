/**
 * RSS 2.0 Feed 路由
 *
 * 为 RSS 阅读器提供博客文章订阅，
 * 访问 /rss.xml 获取 XML 格式的内容更新。
 */
import { getAllPosts, getPostBySlug } from '@/lib/posts'
import { SITE_NAME, SITE_URL } from '@/lib/metadata'
import { cdata, xml, summarize, contentHtml } from '@/lib/rss-content'

const SITE_DESCRIPTION = '回忆已成，故事待叙，后会有期'

export async function GET() {
  const posts = getAllPosts()

  const items = posts.map((post) => {
    const url = `${SITE_URL}/posts/${encodeURIComponent(post.slug)}`
    const date = new Date(post.date)
    // RSS 2.0 要求 RFC 822 格式的日期
    const pubDate = Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString()

    // 列表接口只带元数据，正文要按 slug 单独取
    const content = getPostBySlug(post.slug)?.content ?? ''
    const summary = summarize(post.title, post.excerpt, content)
    const body = content.trim() ? contentHtml(content, SITE_URL) : ''

    return `<item>
      <title><![CDATA[${cdata(post.title)}]]></title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <category><![CDATA[${cdata(post.category)}]]></category>
      <description><![CDATA[${cdata(summary)}]]></description>${body ? `
      <content:encoded><![CDATA[${cdata(body)}]]></content:encoded>` : ''}
    </item>`
  }).join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${SITE_NAME}]]></title>
    <link>${SITE_URL}</link>
    <description><![CDATA[${SITE_DESCRIPTION}]]></description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  })
}
