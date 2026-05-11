'use client'

/**
 * 留言板页面
 *
 * 参考 veryjack.com/board 的设计：
 * - 顶部装饰头图区（可替换为实际图片）
 * - 多行引导文案 + 引用块
 * - Artalk 评论数展示
 * - 独立卡片中的评论区
 */
import { useState, useEffect } from 'react'
import ArtalkComments from '@/components/ArtalkComments'

/** Artalk 服务端地址 */
const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'
/** 站点名称，与 Artalk 管理面板一致 */
const SITE = '不赶'

export default function MessagePage() {
  /** 留言板评论总数 */
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    // 通过 Artalk 通用评论接口获取留言板的评论总数
    const params = new URLSearchParams({
      site_name: SITE,
      page_key: '/message',
      limit: '1',
      flat_mode: 'true',
    })
    fetch(`${SERVER}/api/v2/comments?${params.toString()}`)
      .then((res) => res.json())
      .then((data: any) => {
        // 兼容多种 Artalk API 返回格式
        const t =
          typeof data?.count === 'number' ? data.count :
          typeof data?.total === 'number' ? data.total :
          typeof data?.data?.total === 'number' ? data.data.total :
          Array.isArray(data?.data) ? data.data.length :
          null
        if (typeof t === 'number') setCount(t)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-[800px] mx-auto">
      {/* ===== 留言板介绍卡片 ===== */}
      <div className="card overflow-hidden mb-5">
        {/* 装饰头图区：替换为 <img src="..." /> 即可使用真实图片 */}
        <div className="h-[200px] md:h-[260px] bg-[var(--color-bg-surface)] flex items-center justify-center">
          <span className="text-[13px]" style={{ color: 'var(--color-text-hint)' }}>
            留言板头图
          </span>
        </div>

        <div className="p-[30px] md:p-[45px]">
          {/* 页面标题 */}
          <h1
            className="text-[30px] font-bold mb-4"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            留言板
          </h1>

          {/* 引导语：加粗主句 */}
          <p
            className="text-[18px] font-bold mb-2"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            感谢缘分让我们相遇
          </p>

          {/* 引导语：辅助说明 */}
          <p className="text-[15px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
            一切都是最好的安排
          </p>

          {/* 引用块：强调欢迎留言的意图 */}
          <blockquote
            className="border-l-[3px] pl-4 py-1 mb-4 text-[15px]"
            style={{
              borderColor: 'var(--color-accent)',
              color: 'var(--color-text-secondary)',
              fontStyle: 'italic',
            }}
          >
            欢迎在评论区留言
          </blockquote>

          {/* 评论数统计 */}
          {count !== null && (
            <p className="text-[14px] font-medium" style={{ color: 'var(--color-accent)' }}>
              {count} 评论
            </p>
          )}
        </div>
      </div>

      {/* ===== Artalk 评论区域 ===== */}
      <div className="card p-[30px] md:p-[45px]">
        <ArtalkComments pageKey="/message" pageTitle="留言板" />
      </div>
    </div>
  )
}
