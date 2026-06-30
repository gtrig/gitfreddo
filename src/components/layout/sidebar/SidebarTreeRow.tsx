import { type ReactNode } from 'react'

interface SidebarTreeRowProps {
  icon: ReactNode
  label: string
  depth?: number
  isCurrent?: boolean
  isSelected?: boolean
  suffix?: ReactNode
  title?: string
  onClick?: () => void
  onDoubleClick?: () => void
}

export function SidebarTreeRow({
  icon,
  label,
  depth = 0,
  isCurrent = false,
  isSelected = false,
  suffix,
  title,
  onClick,
  onDoubleClick
}: SidebarTreeRowProps) {
  let rowClass = 'text-gf-fg-muted hover:bg-gf-surface-hover/60 hover:text-gf-fg'
  if (isCurrent) {
    rowClass = 'bg-gf-sidebar-branch-active text-emerald-100'
  } else if (isSelected) {
    rowClass = 'bg-gf-sidebar-item-selected text-gf-fg'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={title}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
      className={`flex w-full items-center gap-1.5 rounded py-1 pr-2 text-left text-xs ${rowClass}`}
    >
      {isCurrent ? (
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm bg-emerald-500 text-white">
          <svg aria-hidden viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="currentColor">
            <path d="M6.5 10.5L3.5 7.5l-.7.7 3.7 3.7 7.7-7.7-.7-.7-7 7z" />
          </svg>
        </span>
      ) : (
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gf-fg-subtle">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {suffix}
    </button>
  )
}

interface SidebarFolderRowProps {
  name: string
  depth?: number
  open: boolean
  onToggle: () => void
}

export function SidebarFolderRow({ name, depth = 0, open, onToggle }: SidebarFolderRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
      className="flex w-full items-center gap-1 rounded py-1 pr-2 text-left text-xs text-gf-fg-muted hover:bg-gf-surface-hover/40 hover:text-gf-fg"
    >
      <Chevron open={open} />
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gf-fg-subtle">
        <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" className="h-3.5 w-3.5">
          <path d="M2.5 5.5l1.5-2h4l1 1.5H13a1 1 0 011 1v5a1 1 0 01-1 1H3.5a1 1 0 01-1-1v-5a1 1 0 011-1z" />
        </svg>
      </span>
      <span className="truncate">{name}</span>
    </button>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="currentColor"
      className={`h-2 w-2 shrink-0 text-gf-fg-subtle transition-transform ${open ? 'rotate-90' : ''}`}
    >
      <path d="M6 4l4 4-4 4V4z" />
    </svg>
  )
}
