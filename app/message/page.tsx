'use client'

import { useState, type FormEvent } from 'react'

interface Message {
  id: number
  name: string
  date: string
  content: string
}

export default function MessagePage() {
  const [form, setForm] = useState({ name: '', content: '' })
  const [messages, setMessages] = useState<Message[]>([])
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.content.trim()) return

    const now = new Date()
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

    setMessages((prev) => [
      {
        id: Date.now(),
        name: form.name.trim(),
        date: dateStr,
        content: form.content.trim(),
      },
      ...prev,
    ])
    setForm({ name: '', content: '' })
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="card p-[30px] md:p-[45px]">
        <h1
          className="text-[30px] font-bold mb-2"
          style={{
            color: 'var(--color-heading)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          留言板
        </h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--color-muted)' }}>
          留下你的想法和建议
        </p>

        {/* 留言表单 */}
        <form onSubmit={handleSubmit}>
          <div
            className="rounded-[5px] p-5 mb-8 border"
            style={{
              backgroundColor: 'var(--color-tag-bg)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="名称 *"
                className="input-base w-full"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <div className="md:col-span-2" />
            </div>
            <textarea
              className="input-base w-full min-h-[120px] resize-y mb-4"
              placeholder="说点什么吧..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
            <div className="flex items-center justify-between">
              {submitted && (
                <span className="text-[13px]" style={{ color: 'var(--color-primary)' }}>
                  ✅ 留言成功！
                </span>
              )}
              <div className="flex-1" />
              <button type="submit" className="btn-primary">
                提交留言
              </button>
            </div>
          </div>
        </form>

        {/* 留言列表 */}
        {messages.length === 0 ? (
          <p className="text-center py-12 text-[14px]" style={{ color: 'var(--color-light)' }}>
            还没有留言，来做第一个说话的人 ✍️
          </p>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="flex gap-5 pb-6"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <div
                  className="w-[46px] h-[46px] rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-[18px]"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {msg.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-[16px]" style={{ color: 'var(--color-heading)' }}>
                      {msg.name}
                    </span>
                    <span className="text-[12px] font-medium" style={{ color: 'var(--color-light)' }}>
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
        )}
      </div>
    </div>
  )
}
