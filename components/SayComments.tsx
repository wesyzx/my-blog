'use client'

import { useState, useEffect } from 'react'

interface Comment {
  id: string
  author: string
  content: string
  date: string
  replyTo?: string // parent comment id for threaded replies
}

interface SayCommentsProps {
  saySlug: string
}

const STORAGE_PREFIX = 'say_comments_'

function loadComments(slug: string): Comment[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + slug)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveComments(slug: string, comments: Comment[]) {
  try {
    localStorage.setItem(STORAGE_PREFIX + slug, JSON.stringify(comments))
  } catch {}
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hour}:${min}`
}

export default function SayComments({ saySlug }: SayCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [replyTarget, setReplyTarget] = useState<string | null>(null)
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setComments(loadComments(saySlug))
  }, [saySlug])

  const topLevel = comments.filter((c) => !c.replyTo)
  const replies = (parentId: string) => comments.filter((c) => c.replyTo === parentId)

  const handleSubmit = () => {
    if (!content.trim()) return
    const newComment: Comment = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      author: author.trim() || '匿名',
      content: content.trim(),
      date: new Date().toISOString(),
      replyTo: replyTarget || undefined,
    }
    const updated = [...comments, newComment]
    setComments(updated)
    saveComments(saySlug, updated)
    setContent('')
    setReplyTarget(null)
    setShowForm(false)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2000)
  }

  const startReply = (commentId: string) => {
    setReplyTarget(commentId)
    setShowForm(true)
  }

  return (
    <div className="mt-6 pt-6" style={{ borderTop: '0.5px solid var(--color-border)' }}>
      {/* 已有评论 */}
      {topLevel.map((comment) => (
        <div key={comment.id} className="mb-5">
          <CommentItem
            comment={comment}
            onReply={() => startReply(comment.id)}
          />
          {replies(comment.id).map((reply) => (
            <div key={reply.id} className="ml-8 mt-3">
              <CommentItem
                comment={reply}
                onReply={() => startReply(comment.id)}
                isReply
              />
            </div>
          ))}
        </div>
      ))}

      {/* 提交成功提示 */}
      {submitted && (
        <div
          className="text-[12px] mb-4 animate-fade-up"
          style={{ color: 'var(--color-accent)' }}
        >
          评论已提交 ✓
        </div>
      )}

      {/* 评论表单 */}
      {showForm ? (
        <div className="space-y-3 animate-fade-up">
          {replyTarget && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              <span>回复评论</span>
              <button
                onClick={() => { setReplyTarget(null); setShowForm(false) }}
                className="hover:text-[var(--color-accent)]"
              >
                取消
              </button>
            </div>
          )}
          <input
            className="input-base w-full text-[13px]"
            placeholder="昵称（选填）"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <textarea
            className="input-base w-full text-[14px] resize-none"
            rows={3}
            placeholder="写下你的想法..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button onClick={handleSubmit} className="btn-primary text-[13px]">
            提交评论
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setReplyTarget(null); setShowForm(true) }}
          className="text-[13px] font-medium transition-colors hover:text-[var(--color-accent)]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          + 添加评论
        </button>
      )}
    </div>
  )
}

function CommentItem({
  comment,
  onReply,
  isReply,
}: {
  comment: Comment
  onReply: () => void
  isReply?: boolean
}) {
  const initial = comment.author.charAt(0)
  const hue = comment.author.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  return (
    <div className="flex gap-3">
      {/* 头像 */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] font-medium text-white"
        style={{ backgroundColor: `hsl(${hue}, 45%, 55%)` }}
      >
        {initial}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {comment.author}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--color-text-hint)' }}>
            {formatDate(comment.date)}
          </span>
        </div>
        <p className="text-[14px] leading-[1.7]" style={{ color: 'var(--color-text-secondary)' }}>
          {comment.content}
        </p>
        {!isReply && (
          <button
            onClick={onReply}
            className="text-[11px] mt-1.5 transition-colors hover:text-[var(--color-accent)]"
            style={{ color: 'var(--color-text-hint)' }}
          >
            回复
          </button>
        )}
      </div>
    </div>
  )
}
