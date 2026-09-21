/**
 * 展示用的日期格式化。
 *
 * ueno 的列表和文章页都用英文短月格式（Nov 13, 2025），
 * 这里集中一处，避免三个文件各写一遍。
 */

/** ueno 风格：Nov 13, 2025 */
export function formatItemDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

/** 编辑部风格：2026.09.08 */
export function formatEditorialDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '—'
  return date.toISOString().slice(0, 10).replaceAll('-', '.')
}
