/**
 * RSS 2.0 Feed 路由
 *
 * 为 RSS 阅读器提供博客文章订阅，
 * 访问 /rss.xml 获取 XML 格式的内容更新。
 */
import { getAllPosts } from '@/lib/posts'

const SITE_URL = 'https://guanyan.me'
const SITE_TITLE = '轨道之外'
const SITE_DESCRIPTION = '回忆已成，故事待叙，后会有期'

function cdata(value: string) {
  return value.replace(/]]>/g, ']]]]><![CDATA[>')
}

function xml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export async function GET() {
  const posts = getAllPosts()

  const items = posts.map((post) => {
    const url = `${SITE_URL}/posts/${encodeURIComponent(post.slug)}`
    const date = new Date(post.date)
    // RSS 2.0 要求 RFC 822 格式的日期
    const pubDate = Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString()

    return `<item>
      <title><![CDATA[${cdata(post.title)}]]></title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <category><![CDATA[${cdata(post.category)}]]></category>
      <description><![CDATA[${cdata(post.excerpt || post.title)}]]></description>
    </item>`
  }).join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${SITE_TITLE}]]></title>
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
