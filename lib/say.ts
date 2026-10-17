import 'server-only'
import { bundleData } from './data-bundle'
import { fetchMemosWithFallback, type SayMeta } from './memos.mjs'

export type { SayMeta } from './memos.mjs'

const MEMOS_BASE_URL = process.env.MEMOS_BASE_URL || 'https://memos.guanyan.me'
const MEMOS_API_URL = process.env.MEMOS_API_URL || `${MEMOS_BASE_URL}/api/v1/memos`

export async function getAllSays(): Promise<SayMeta[]> {
  return fetchMemosWithFallback(MEMOS_API_URL, process.env.MEMOS_TOKEN, {
    // 不缓存：短记的增删都要求立刻反映到页面上。
    // 之前用 next: { revalidate: 60 }，加上页面本身的 ISR，最坏要等两分钟还得刷两次。
    cache: 'no-store',
  }, (error) => {
    const reason = process.env.MEMOS_TOKEN
      ? `请求失败：${(error as Error).message}`
      : '未配置 MEMOS_TOKEN —— 请求以匿名身份发出，Memos 会直接返回 401'
    console.error([
      '',
      '  ! Memos 同步失败 —— 短记页面将继续沿用旧快照，内容不会更新',
      `  ! 原因: ${reason}`,
      '  ! 修复: 在 .env.local 与部署环境配置有效的 MEMOS_TOKEN',
      `  ! 自检: curl -H "Authorization: Bearer $MEMOS_TOKEN" "${MEMOS_BASE_URL}/api/v1/memos?pageSize=2"`,
      '',
    ].join('\n'))
    return bundleData.says as SayMeta[]
  })
}

export async function getSayBySlug(slug: string): Promise<SayMeta | null> {
  const says = await getAllSays()
  return says.find((say) => say.slug === slug) ?? null
}

export function getSaySummary(content: string, maxLength = 72) {
  const plain = content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!plain) return '一则短记'
  return plain.length > maxLength ? `${plain.slice(0, maxLength)}…` : plain
}
