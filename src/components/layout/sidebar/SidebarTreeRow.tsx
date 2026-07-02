import { type ReactNode } from 'react'
import { FolderIcon } from '@heroicons/react/24/outline'
import { CurrentHeadCheck } from '@/components/ui/CurrentHeadCheck'
import { SidebarIconChevron } from '@/components/layout/sidebar/SidebarIcons'
import { SidebarMenuButton } from '@/components/layout/sidebar/SidebarMenuButton'
import type { ContextMenuItem } from '@/components/ui/ContextMenu'
import type { OpenContextMenu } from '@/hooks/useContextMenu'

interface SidebarTreeRowProps {
  icon: ReactNode
  label: string
  depth?: number
  isCurrent?: boolean
  isSelected?: boolean
  labelClassName?: string
  suffix?: ReactNode
  title?: string
  menuItems?: ContextMenuItem[]
  openMenu?: OpenContextMenu
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
  labelClassName = '',
  suffix,
  title,
  menuItems,
  openMenu,
  onClick,
  onDoubleClick,
  onContextMenu
}: SidebarTreeRowProps) {
  let rowClass = 'text-gf-fg-muted hover:bg-gf-surface-hover/60 hover:text-gf-fg'
  if (isSelected) {
    rowClass = 'bg-gf-sidebar-item-selected text-gf-fg'
  }

  const hasMenu = Boolean(menuItems && openMenu)

  function handleContextMenu(event: React.MouseEvent<HTMLButtonElement>) {
    if (hasMenu && menuItems && openMenu) {
      openMenu(event, menuItems)
      return
    }
    onContextMenu?.(event)
  }

  return (
    <div
      className={`flex w-full items-center gap-1.5 rounded py-1 pr-2 text-xs ${rowClass}`}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
    >
      {isCurrent ? <CurrentHeadCheck /> : null}
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gf-fg-subtle">
        {icon}
      </span>
      {hasMenu ? <SidebarMenuButton items={menuItems!} onOpenMenu={openMenu!} /> : null}
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={handleContextMenu}
        title={title}
        className={`min-w-0 flex-1 truncate text-left ${labelClassName}`}
      >
        {label}
      </button>
      {suffix}
    </div>
  )
}

interface SidebarFolderRowProps {
  name: string
  depth?: number
  open: boolean
  onToggle: () => void
  menuItems?: ContextMenuItem[]
  openMenu?: OpenContextMenu
  onContextMenu?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

export function SidebarFolderRow({
  name,
  depth = 0,
  open,
  onToggle,
  menuItems,
  openMenu,
  onContextMenu
}: SidebarFolderRowProps) {
  const hasMenu = Boolean(menuItems && openMenu)

  function handleContextMenu(event: React.MouseEvent<HTMLButtonElement>) {
    if (hasMenu && menuItems && openMenu) {
      openMenu(event, menuItems)
      return
    }
    onContextMenu?.(event)
  }

  return (
    <div
      className="flex w-full items-center gap-1 rounded py-1 pr-2 text-xs text-gf-fg-muted hover:bg-gf-surface-hover/40 hover:text-gf-fg"
      style={{ paddingLeft: `${8 + depth * 14}px` }}
    >
      <button
        type="button"
        onClick={onToggle}
        onContextMenu={handleContextMenu}
        className="flex shrink-0 items-center"
        aria-label={open ? 'Collapse folder' : 'Expand folder'}
      >
        <Chevron open={open} />
      </button>
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gf-fg-subtle">
        <FolderIcon aria-hidden className="h-3.5 w-3.5" />
      </span>
      {hasMenu ? <SidebarMenuButton items={menuItems!} onOpenMenu={openMenu!} /> : null}
      <button
        type="button"
        onClick={onToggle}
        onContextMenu={handleContextMenu}
        className="min-w-0 flex-1 truncate text-left"
      >
        {name}
      </button>
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return <SidebarIconChevron open={open} className="h-2 w-2 shrink-0 text-gf-fg-subtle" />
}
