'use client'

import { useState } from 'react'

const emojis = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '🥰', '😘', '🤗', '🤔', '🫡', '👍', '❤️', '🔥', '💯']

const demoComments = [
  {
    id: 1,
    name: '访客小明',
    level: 'V3',
    date: '2026年3月30日 14:23',
    content: '写得真好，感同身受！走出舒适圈确实需要勇气。',
    replies: [
      {
        id: 11,
        name: 'Can Chou',
        level: 'V5',
        date: '2026年3月30日 15:10',
        content: '@访客小明 谢谢支持！确实迈出那一步很难，但回头看都是值得的。',
      },
    ],
  },
  {
    id: 2,
    name: '摄影爱好者',
    level: 'V2',
    date: '2026年3月29日 09:45',
    content: '期待更多关于摄影的文章！',
    replies: [],
  },
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default function Comments({ postDate }: { postDate?: string }) {
  const [showEmoji, setShowEmoji] = useState(false)
  const [commentText, setCommentText] = useState('')

  const insertEmoji = (emoji: string) => {
    setCommentText((prev) => prev + emoji)
    setShowEmoji(false)
  }

  return (
    <section id="comments">
      <h2
        className="text-[20px] font-bold mb-6"
        style={{ color: 'var(--color-heading)' }}
      >
        {demoComments.length} 评论
      </h2>

      {/* 评论表单 */}
      <div
        className="rounded-[5px] p-5 mb-8 border"
        style={{
          backgroundColor: 'var(--color-tag-bg)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="名称 *"
            className="input-base w-full"
          />
          <input
            type="email"
            placeholder="邮箱 *"
            className="input-base w-full"
          />
        </div>
        <input
          type="url"
          placeholder="站点（选填）"
          className="input-base w-full mb-4"
        />
        <div className="relative mb-3">
          <textarea
            className="input-base w-full min-h-[120px] resize-y"
            placeholder="说点什么吧..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button
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
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              {emojis.map((emoji) => (
                <button
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
          <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: 'var(--color-muted)' }}>
            <input type="checkbox" className="rounded" />
            有人回复时邮件通知
          </label>
          <button className="btn-primary">
            发表评论
          </button>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="space-y-6">
        {demoComments.map((comment) => (
          <div key={comment.id}>
            <div
              className="flex gap-4 pb-6"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div
                className="w-[50px] h-[50px] rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-[18px]"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {comment.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-[15px]" style={{ color: 'var(--color-heading)' }}>
                    {comment.name}
                  </span>
                  <span
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--color-tag-bg)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    {comment.level}
                  </span>
                  <span className="text-[12px]" style={{ color: 'var(--color-light)' }}>
                    {comment.date}
                  </span>
                </div>
                <p className="text-[15px] leading-relaxed mb-2" style={{ color: 'var(--color-body)' }}>
                  {comment.content}
                </p>
                <button
                  className="text-[13px] font-semibold transition-colors"
                  style={{ color: 'var(--color-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
                >
                  回复
                </button>
              </div>
            </div>

            {/* 子评论 */}
            {comment.replies.map((reply) => (
              <div
                key={reply.id}
                className="flex gap-4 pt-6 pb-6 ml-[70px]"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <div
                  className="w-[50px] h-[50px] rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-[18px]"
                  style={{ backgroundColor: 'var(--color-primary-hover)' }}
                >
                  {reply.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-[15px]" style={{ color: 'var(--color-heading)' }}>
                      {reply.name}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--color-tag-bg)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {reply.level}
                    </span>
                    <span className="text-[12px]" style={{ color: 'var(--color-light)' }}>
                      {reply.date}
                    </span>
                  </div>
                  <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-body)' }}>
                    {reply.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
