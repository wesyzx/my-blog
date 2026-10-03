/**
 * 关于页面内容管理模块
 * 内容由本地 Markdown 在构建时写入数据快照
 */
import { bundleData } from './data-bundle'

/**
 * 获取关于页面的原始 Markdown 内容
 */
export function getAboutContent(): string {
  return bundleData.about || '';
}
