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

export function HeaderIconStash(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 4h10v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
      <path d="M3 6h10" />
      <path d="M6 9h4" strokeLinecap="round" />
    </Icon>
  )
}

export function HeaderIconFetch(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5.5V3.5M12 5.5H10M12 5.5A4.5 4.5 0 114 10" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

export function HeaderIconPull(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3.5v6.5" strokeLinecap="round" />
      <path d="M5.5 7.5L8 10l2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12.5h8" strokeLinecap="round" />
    </Icon>
  )
}

export function HeaderIconPush(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 12.5V6" strokeLinecap="round" />
      <path d="M5.5 8.5L8 6l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 3.5h8" strokeLinecap="round" />
    </Icon>
  )
}

export function HeaderIconLogs(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="2.5" width="10" height="11" rx="1" />
      <path d="M5 6h6M5 8.5h4" strokeLinecap="round" />
    </Icon>
  )
}

export function HeaderIconSettings(props: IconProps) {
  return (
    <Icon {...props} strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path
        d="M8 2v1.1M8 12.9V14M2 8h1.1M12.9 8H14"
        strokeLinecap="round"
      />
      <path
        d="M4.1 4.1l.78.78M11.12 11.12l.78.78M4.1 11.9l.78-.78M11.12 4.88l.78-.78"
        strokeLinecap="round"
      />
      <path d="M8 3.15l.55 1 .9.35.35.9 1 .55-1 .55-.35.9-.9.35-.55 1-.55-1-.9-.35-.35-.9-1-.55 1-.55.35-.9.9-.35.55-1" />
    </Icon>
  )
}
