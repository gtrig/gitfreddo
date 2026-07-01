import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      {...props}
    >
      {children}
    </svg>
  )
}

export function SidebarIconLocal(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="3" width="12" height="9" rx="1" />
      <path d="M5 13h6" strokeLinecap="round" />
    </Icon>
  )
}

export function SidebarIconRemote(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2v2M4.5 4.5l1.5 1.5M11.5 4.5l-1.5 1.5" strokeLinecap="round" />
      <path d="M3 10a5 5 0 0110 0" />
      <path d="M6 10h4" strokeLinecap="round" />
    </Icon>
  )
}

export function SidebarIconStash(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 4h10v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
      <path d="M3 6h10" />
      <path d="M6 9h4" strokeLinecap="round" />
    </Icon>
  )
}

export function SidebarIconTag(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 3.5h5l4.5 4.5v5a1 1 0 01-1 1h-8.5a1 1 0 01-1-1v-8.5a1 1 0 011-1z" />
      <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function SidebarIconBranch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="4.5" cy="4.5" r="1.75" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="11.5" r="1.75" fill="currentColor" stroke="none" />
      <path d="M6 4.5h3.5a2 2 0 012 2V9.5" />
    </Icon>
  )
}

export function SidebarIconFolder(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 5.5l1.5-2h4l1 1.5H13a1 1 0 011 1v5a1 1 0 01-1 1H3.5a1 1 0 01-1-1v-5a1 1 0 011-1z" />
    </Icon>
  )
}

export function SidebarIconOrigin(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function SidebarIconPullRequest(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="4.5" cy="4.5" r="1.75" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="11.5" r="1.75" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="7.5" r="1.75" fill="currentColor" stroke="none" />
      <path d="M4.5 6.25v3.5M6.25 7.5h3.5a2 2 0 012 2v0" />
    </Icon>
  )
}

export function SidebarIconIssues(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function SidebarIconCheck(props: IconProps) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M6.5 10.5L3.5 7.5l-.7.7 3.7 3.7 7.7-7.7-.7-.7-7 7z" />
    </svg>
  )
}

export function SidebarIconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7" cy="7" r="3.5" />
      <path d="M10 10l3 3" strokeLinecap="round" />
    </Icon>
  )
}

export function SidebarIconChevron({ open, ...props }: IconProps & { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="currentColor"
      className={`transition-transform ${open ? 'rotate-90' : ''} ${props.className ?? ''}`}
      {...props}
    >
      <path d="M6 4l4 4-4 4V4z" />
    </svg>
  )
}
