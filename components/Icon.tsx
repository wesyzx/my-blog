import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'orbit' | 'post' | 'say' | 'food' | 'gallery' | 'message' | 'about'
  | 'sun' | 'moon' | 'menu' | 'close' | 'rss' | 'github' | 'mail' | 'x'
  | 'location' | 'calendar' | 'comment' | 'eye' | 'arrow-left' | 'arrow-right'
  | 'chevron-down' | 'image' | 'map' | 'activity'

const paths: Record<IconName, ReactNode> = {
  orbit: <><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="9" ry="4.5" transform="rotate(-28 12 12)"/><circle cx="19.2" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></>,
  post: <><path d="M6 3.5h9l3 3V20.5H6z"/><path d="M15 3.5v3h3M9 11h6M9 15h5"/></>,
  say: <><path d="M4 5.5h16v11H9l-4.5 3v-3H4z"/><path d="M8 9h8M8 12.5h5"/></>,
  food: <><path d="M7 3v7M4.5 3v4.5A2.5 2.5 0 0 0 7 10a2.5 2.5 0 0 0 2.5-2.5V3M7 10v11M15 3v18M15 3c3 1.2 4.5 4 4.5 7H15"/></>,
  gallery: <><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="m5.5 17 4.3-4 3.2 3 2.8-2.5 2.7 3.5"/></>,
  message: <><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-5 3v-3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 9h8M8 13h5"/></>,
  about: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
  moon: <path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8a8.5 8.5 0 1 0 11.4 11.4Z"/>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  rss: <><circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none"/><path d="M4 11a9 9 0 0 1 9 9M4 5a15 15 0 0 1 15 15"/></>,
  github: <path d="M12 2.8a9.2 9.2 0 0 0-2.9 17.9v-2c-2.4.5-2.9-1-2.9-1-.4-1-.9-1.3-.9-1.3-.8-.5.1-.5.1-.5.8.1 1.3.9 1.3.9.7 1.3 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.9-.2-3.8-.9-3.8-4.1 0-.9.3-1.7.9-2.3-.1-.2-.4-1.1.1-2.2 0 0 .7-.2 2.3.9a8 8 0 0 1 4.2 0c1.6-1.1 2.3-.9 2.3-.9.5 1.1.2 2 .1 2.2.6.6.9 1.4.9 2.3 0 3.2-1.9 3.9-3.8 4.1.3.3.6.8.6 1.6v2.7A9.2 9.2 0 0 0 12 2.8Z"/>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4.5 7 7.5 6 7.5-6"/></>,
  x: <path d="M5 4h4.2l10 16H15L5 4Zm1 16 6.2-6.8M12.8 10.7 19 4"/>,
  location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  comment: <path d="M4 4.5h16v12H9l-5 3.5z"/>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
  'arrow-left': <><path d="m10 6-6 6 6 6M4 12h16"/></>,
  'arrow-right': <><path d="m14 6 6 6-6 6M20 12H4"/></>,
  'chevron-down': <path d="m7 9 5 5 5-5"/>,
  image: <><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="m5 17 5-5 3 3 2-2 4 4"/></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
}

type IconProps = SVGProps<SVGSVGElement> & { name: IconName }

export default function Icon({ name, className = '', ...props }: IconProps) {
  const filled = name === 'github'
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
