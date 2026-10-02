/**
 * 所有一级栏目共用同一个页头。
 * 视觉标记由 CSS 放在 680px 阅读栏之外的左侧留白里，对齐 Ueno 的 main_mark。
 */
export default function PageHeader({
  title,
  eyebrow,
  description,
  className = '',
}: {
  title: string
  eyebrow?: string
  description?: string
  className?: string
}) {
  return (
    <header className={`page-header${className ? ` ${className}` : ''}`}>
      {eyebrow && <p className="page-kicker">{eyebrow}</p>}
      <h1 className="page-title">{title}</h1>
      {description && <p className="page-lead">{description}</p>}
    </header>
  )
}
