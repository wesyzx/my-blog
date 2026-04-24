'use client'

import { useState } from 'react'

const demoMessages = [
  { id: 1, name: '访客1', date: '2026年1月1日', content: '非常喜欢这个博客的极简风格！页面排版很干净，阅读体验非常棒。' },
  { id: 2, name: '访客2', date: '2026年2月15日', content: '关注这个博客很久了，每篇文章都很有质量，加油！' },
  { id: 3, name: '访客3', date: '2026年3月20日', content: '想问一下博主用的什么主题？非常好看！' },
]

export default function MessagePage() {
  const [messages] = useState(demoMessages)

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="card p-[30px] md:p-[40px]">
        <h1 className="text-[30px] font-bold mb-2" style={{ color: 'var(--color-heading)' }}>
          留言板
        </h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--color-muted)' }}>
          留下你的想法和建议 :D
        </p>

        {/* 留言表单 */}
        <div
          className="rounded-[5px] p-5 mb-8 border"
          style={{
            backgroundColor: 'var(--color-tag-bg)',
            borderColor: 'var(--color-border)',
          }}
        >
          <textarea
            className="input-base w-full min-h-[120px] resize-y mb-4"
            placeholder="说点什么吧..."
          />
          <div className="flex justify-end">
            <button className="btn-primary">
              提交留言
            </button>
          </div>
        </div>

        {/* 留言列表 */}
        <div className="space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="flex gap-5 pb-6"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div
                className="w-[50px] h-[50px] rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-[20px]"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {msg.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-[16px]" style={{ color: 'var(--color-heading)' }}>
                    {msg.name}
                  </span>
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--color-light)' }}>
                    {msg.date}
                  </span>
                </div>
                <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-body)' }}>
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
