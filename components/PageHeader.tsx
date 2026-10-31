import type { ReactNode } from 'react'
import { formatItemDate } from '@/lib/format'

/**
 * 栏目与详情页共用标题区：日期、主标题、简介、辅助信息。
 * 详情页不重复栏目名称，避免与主题争夺层级。
 */
export default function PageHeader({
  title,
  eyebrow,
  description,
  className = '',
  actions,
  date,
  children,
}: {
  title: string
  eyebrow?: string
  description?: string
  className?: string
  actions?: ReactNode
  date?: string
  children?: ReactNode
}) {
  return (
    <header className={`page-header${className ? ` ${className}` : ''}`}>
      {date ? (
        <time className="page-kicker" dateTime={date}>{formatItemDate(date)}</time>
      ) : eyebrow ? <p className="page-kicker">{eyebrow}</p> : null}
      <div className="page-header-heading">
        <h1 className="page-title">{title}</h1>
        {actions}
      </div>
      {description && <p className="page-lead">{description}</p>}
      {children && <div className="page-header-details">{children}</div>}
    </header>
  )
}
