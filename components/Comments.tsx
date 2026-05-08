'use client'

import { useState, type FormEvent } from 'react'

const emojis = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '🥰', '😘', '🤗', '🤔', '🫡', '👍', '❤️', '🔥', '💯']

export default function Comments() {
  const [showEmoji, setShowEmoji] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    website: '',
    content: '',
    notify: false,
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.content.trim()) return
    setSubmitted(true)
  }

  const insertEmoji = (emoji: string) => {
    setForm((prev) => ({ ...prev, content: prev.content + emoji }))
    setShowEmoji(false)
  }

  if (submitted) {
    return (
      <section id="comments">
        <div className="text-center py-12">
          <p className="text-[18px] font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            评论已提交 ✨
          </p>
          <p className="text-[14px]" style={{ color: 'var(--color-text-muted)' }}>
            感谢你的留言，审核通过后将显示在这里。
          </p>
        </div>
      </section>
    )
  }

  return (
    <section id="comments">
      <h2
        className="text-[20px] font-bold mb-6"
        style={{
          color: 'var(--color-text-primary)',
          fontFamily: "Georgia, 'Noto Serif SC', serif",
        }}
      >
        发表评论
      </h2>

      {/* 评论表单 */}
      <form onSubmit={handleSubmit}>
        <div
          className="rounded-[5px] p-5 mb-4 border"
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="名称 *"
              className="input-base w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="邮箱 *（不会公开）"
              className="input-base w-full"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <input
            type="url"
            placeholder="网站（选填）"
            className="input-base w-full mb-4"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
          <div className="relative mb-3">
            <textarea
              className="input-base w-full min-h-[120px] resize-y"
              placeholder="说点什么吧..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
            <button
              type="button"
              className="absolute bottom-3 right-3 text-[18px] opacity-50 hover:opacity-100 transition-opacity"
              onClick={() => setShowEmoji(!showEmoji)}
              title="表情"
            >
              😊
            </button>
            {showEmoji && (
              <div
                className="absolute bottom-12 right-3 p-3 rounded-[8px] border shadow-lg grid grid-cols-11 gap-1.5 z-10"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {emojis.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    className="text-[18px] hover:scale-125 transition-transform p-0.5"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
              <input
                type="checkbox"
                className="rounded"
                checked={form.notify}
                onChange={(e) => setForm({ ...form, notify: e.target.checked })}
              />
              有人回复时邮件通知
            </label>
            <button type="submit" className="btn-primary">
              发表评论
            </button>
          </div>
        </div>
      </form>

      {/* 暂无评论提示 */}
      <p className="text-center py-8 text-[14px]" style={{ color: 'var(--color-text-hint)' }}>
        暂无评论，来做第一个留言的人吧 👋
      </p>
    </section>
  )
}
