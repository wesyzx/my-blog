/**
 * 关于页面内容管理模块
 * 现已全面接入 Notion 数据源
 */
import { bundleData } from './data-bundle'

/**
 * 获取关于页面的原始 Markdown 内容
 */
export function getAboutContent(): string {
  return bundleData.about || '';
}
