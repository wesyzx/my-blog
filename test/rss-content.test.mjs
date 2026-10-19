import assert from 'node:assert/strict'
import test from 'node:test'
import { importTypeScript } from './helpers/import-typescript.mjs'

const { cdata, contentHtml, summarize, xml } = await importTypeScript(new URL('../lib/rss-content.ts', import.meta.url))

test('RSS resolves Obsidian attachments and internal links to absolute site URLs', () => {
  const html = contentHtml([
    '![Photo](/obsidian/attachments/photo%20one.jpg)',
    '[Next](/posts/next)',
    '[External](https://example.com/?a=1&b=2)',
  ].join('\n\n'), 'https://guanyan.me')
  assert.match(html, /src="https:\/\/guanyan.me\/obsidian\/attachments\/photo%20one.jpg"/)
  assert.match(html, /href="https:\/\/guanyan.me\/posts\/next"/)
  assert.match(html, /href="https:\/\/example.com\/\?a=1&amp;b=2"/)
})

test('RSS escapes HTML, preserves URL underscores, and leaves unsafe protocols as text', () => {
  const html = contentHtml([
    '<script>alert("x")</script>',
    '[unsafe](javascript:alert(1))',
    '[Photo](https://example.com/photo_one.jpg)',
  ].join('\n\n'), 'https://guanyan.me')
  assert.doesNotMatch(html, /<script|href="javascript:/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /photo_one.jpg/)
  assert.equal(cdata('a]]>b'), 'a]]]]><![CDATA[>b')
  assert.equal(xml('<&">'), '&lt;&amp;&quot;&gt;')
  assert.equal(summarize('Title', '', ''), 'Title')
})
