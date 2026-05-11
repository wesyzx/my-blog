/**
 * 关于页面内容管理模块
 *
 * 读取 content/about.md，将其 Markdown 内容传给前端，
 * 由 next-mdx-remote 渲染为 HTML。
 * 方便在 Obsidian 中直接编辑「关于」页面的内容。
 */
import fs from 'fs'
import path from 'path'

/** 关于页面的 Markdown 文件路径 */
const aboutPath = path.join(process.cwd(), 'content/about.md')

/**
 * 获取关于页面的原始 Markdown 内容
 */
export function getAboutContent(): string {
  try {
    return fs.readFileSync(aboutPath, 'utf8')
  } catch {
    return ''
  }
}
