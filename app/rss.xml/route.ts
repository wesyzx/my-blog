/**
 * RSS 2.0 Feed 路由
 *
 * 为 RSS 阅读器提供博客文章订阅，
 * 访问 /rss.xml 获取 XML 格式的内容更新。
 */
import { getAllPosts, getPostBySlug } from '@/lib/posts'

const SITE_URL = 'https://guanyan.me'
const SITE_TITLE = '轨道之外'
const SITE_DESCRIPTION = '回忆已成，故事待叙，后会有期'

/** 摘要长度上限（按字符计） */
const SUMMARY_LIMIT = 180

function cdata(value: string) {
  return value.replace(/]]>/g, ']]]]><![CDATA[>')
}

function xml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * 去掉 Markdown 标记，得到可直接阅读的纯文本。
 * 用于在没有手写摘要时，从正文里兜底生成摘要。
 */
function plainText(markdown: string) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function summarize(title: string, excerpt: string, content: string) {
  const handWritten = plainText(excerpt)
  if (handWritten) return handWritten

  const body = plainText(content)
  if (!body) return title
  return body.length > SUMMARY_LIMIT ? `${body.slice(0, SUMMARY_LIMIT)}…` : body
}

// 分组位置：1/2/3 = 图片或链接（整体 / 文字 / URL），4/5 = 加粗，6/7 = 行内代码
const INLINE_TOKEN = /(!?\[([^\]]*)\]\((https?:\/\/[^\s)]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)/g

/**
 * 行内 Markdown → HTML。
 * 单次扫描：只转义普通片段，生成的标签不会再被后续规则扫到
 * （否则正文里的下划线会破坏链接 URL）。
 */
function inlineHtml(text: string) {
  let output = ''
  let cursor = 0
  let match: RegExpExecArray | null

  INLINE_TOKEN.lastIndex = 0
  while ((match = INLINE_TOKEN.exec(text)) !== null) {
    if (match.index > cursor) output += escapeHtml(text.slice(cursor, match.index))

    // 用 URL 分组判断是不是链接/图片：外层分组对所有分支都为真，不能拿它判断
    if (match[3]) {
      const label = escapeHtml(match[2] ?? '')
      const href = escapeHtml(match[3])
      output += match[0].startsWith('!')
        ? `<img src="${href}" alt="${label}" />`
        : `<a href="${href}">${label}</a>`
    } else if (match[5]) {
      output += `<strong>${escapeHtml(match[5])}</strong>`
    } else if (match[7]) {
      output += `<code>${escapeHtml(match[7])}</code>`
    }

    cursor = match.index + match[0].length
  }

  if (cursor < text.length) output += escapeHtml(text.slice(cursor))
  return output
}

/**
 * 把 Markdown 正文转成一份简单的 HTML，供 content:encoded 使用。
 * 只处理正文里实际出现的语法：标题、列表、引用、代码块、段落。
 */
function contentHtml(markdown: string) {
  const blocks = markdown.trim().split(/\n{2,}/).filter(Boolean)
  const html: string[] = []

  blocks.forEach((block) => {
    const fence = block.match(/^```[^\n]*\n([\s\S]*?)\n?```$/)
    if (fence) {
      html.push(`<pre><code>${escapeHtml(fence[1])}</code></pre>`)
      return
    }

    const heading = block.match(/^(#{1,6})\s+([\s\S]*)$/)
    if (heading) {
      const level = heading[1].length
      html.push(`<h${level}>${inlineHtml(heading[2])}</h${level}>`)
      return
    }

    const lines = block.split('\n')

    if (lines.every((line) => /^[-*+]\s+/.test(line))) {
      html.push(`<ul>${lines.map((line) => `<li>${inlineHtml(line.replace(/^[-*+]\s+/, ''))}</li>`).join('')}</ul>`)
      return
    }

    if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
      html.push(`<ol>${lines.map((line) => `<li>${inlineHtml(line.replace(/^\s*\d+\.\s+/, ''))}</li>`).join('')}</ol>`)
      return
    }

    if (lines.every((line) => /^>\s?/.test(line))) {
      html.push(`<blockquote>${lines.map((line) => inlineHtml(line.replace(/^>\s?/, ''))).join('<br />')}</blockquote>`)
      return
    }

    html.push(`<p>${lines.map((line) => inlineHtml(line)).join('<br />')}</p>`)
  })

  return html.join('\n')
}

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
    const body = content.trim() ? contentHtml(content) : ''

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
