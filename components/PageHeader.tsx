import type { ReactNode } from 'react'

/**
 * 所有一级栏目共用同一个页头。
 * 标题与底部细线组成简洁的栏目标题区。
 */
export default function PageHeader({
  title,
  eyebrow,
  description,
  className = '',
  actions,
}: {
  title: string
  eyebrow?: string
  description?: string
  className?: string
  actions?: ReactNode
}) {
  return (
    <header className={`page-header${className ? ` ${className}` : ''}`}>
      {eyebrow && <p className="page-kicker">{eyebrow}</p>}
      <div className="page-header-heading">
        <h1 className="page-title">{title}</h1>
        {actions}
      </div>
      {description && <p className="page-lead">{description}</p>}
    </header>
  )
}
