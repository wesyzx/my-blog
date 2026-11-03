/**
 * 暂时隐藏但保留的板块。
 *
 * 隐藏后仍会生成页面并保留全部内容，只从导航、内容流、归档、站点地图、
 * 页脚统计和搜索索引中移除。恢复时删除对应路由即可。
 */
export const HIDDEN_SECTIONS = ['/food', '/message', '/archive'] as const

export function isSectionVisible(path: string) {
  return !HIDDEN_SECTIONS.some((section) => path === section || path.startsWith(`${section}/`))
}
