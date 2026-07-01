import { type ReactNode } from 'react'
import { FolderIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import { SidebarIconChevron } from '@/components/layout/sidebar/SidebarIcons'

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
  onContextMenu?: (event: React.MouseEvent<HTMLButtonElement>) => void
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
  onDoubleClick,
  onContextMenu
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
      onContextMenu={onContextMenu}
      title={title}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
      className={`flex w-full items-center gap-1.5 rounded py-1 pr-2 text-left text-xs ${rowClass}`}
    >
      {isCurrent ? (
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm bg-emerald-500 text-white">
          <CheckIcon aria-hidden className="h-2.5 w-2.5" />
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
  onContextMenu?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

export function SidebarFolderRow({
  name,
  depth = 0,
  open,
  onToggle,
  onContextMenu
}: SidebarFolderRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      onContextMenu={onContextMenu}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
      className="flex w-full items-center gap-1 rounded py-1 pr-2 text-left text-xs text-gf-fg-muted hover:bg-gf-surface-hover/40 hover:text-gf-fg"
    >
      <Chevron open={open} />
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gf-fg-subtle">
        <FolderIcon aria-hidden className="h-3.5 w-3.5" />
      </span>
      <span className="truncate">{name}</span>
    </button>
  )
}

function Chevron({ open }: { open: boolean }) {
  return <SidebarIconChevron open={open} className="h-2 w-2 shrink-0 text-gf-fg-subtle" />
}
