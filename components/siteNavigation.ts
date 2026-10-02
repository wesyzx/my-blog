import type { IconName } from './Icon'

export interface SiteNavItem {
  label: string
  href: string
  icon: IconName
}

/** 桌面侧栏与移动菜单共用，避免两个端点出现不同的信息架构。 */
export const SITE_NAV_ITEMS: SiteNavItem[] = [
  { label: '首页', href: '/', icon: 'orbit' },
  { label: '博文', href: '/posts', icon: 'post' },
  { label: '短记', href: '/say', icon: 'say' },
  { label: '相册', href: '/gallery', icon: 'gallery' },
  { label: '美食', href: '/food', icon: 'food' },
  { label: '运动', href: '/workouts', icon: 'activity' },
  { label: '留言', href: '/message', icon: 'message' },
  { label: '关于', href: '/about', icon: 'about' },
]
