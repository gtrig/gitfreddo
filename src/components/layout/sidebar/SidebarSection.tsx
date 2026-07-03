import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon } from '@heroicons/react/24/outline'
import { SidebarIconChevron } from '@/components/layout/sidebar/SidebarIcons'
import { SidebarMenuButton } from '@/components/layout/sidebar/SidebarMenuButton'
import { ContextMenu } from '@/components/ui/ContextMenu'
import type { ContextMenuItem } from '@/components/ui/ContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'

const STORAGE_PREFIX = 'gitfreddo:section:'

function readStoredOpen(sectionId: string, defaultOpen: boolean): boolean {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${sectionId}`)
    if (stored !== null) {
      return stored === 'true'
    }
  } catch {
    // ignore storage errors
  }
  return defaultOpen
}

export interface SidebarSectionProps {
  sectionId: string
  title: string
  icon: ReactNode
  count?: number
  defaultOpen?: boolean
  onAdd?: () => void
  addTitle?: string
  menuItems?: ContextMenuItem[]
  footer?: boolean
  flexible?: boolean
  children: ReactNode
}

export function SidebarSection({
  sectionId,
  title,
  icon,
  count,
  defaultOpen = true,
  onAdd,
  addTitle,
  menuItems,
  footer = false,
  flexible = false,
  children
}: SidebarSectionProps) {
  const { t } = useTranslation()
  const resolvedAddTitle = addTitle ?? t('sidebar.add')
  const [open, setOpen] = useState(() => readStoredOpen(sectionId, defaultOpen))
  const { state: menuState, openMenu, closeMenu } = useContextMenu()

  function toggle() {
    setOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${sectionId}`, String(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  const sectionClass = flexible && open ? 'flex min-h-0 flex-1 flex-col' : ''
  const hasMenu = Boolean(menuItems?.some((item) => !item.separator))

  return (
    <section className={`border-b border-gf-border/60 ${sectionClass}`}>
      <div
        className={`flex items-center gap-1 bg-gf-sidebar-section-header px-2 ${footer ? 'py-1.5' : 'py-1'} ${flexible ? 'shrink-0' : ''}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            type="button"
            onClick={toggle}
            className="flex shrink-0 items-center rounded py-0.5 hover:text-gf-fg"
            aria-expanded={open}
            aria-label={open ? t('sidebar.collapseSection', { title }) : t('sidebar.expandSection', { title })}
          >
            <SidebarIconChevron open={open} className="h-2.5 w-2.5 text-gf-fg-subtle" />
          </button>
          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-gf-fg-subtle">
            {icon}
          </span>
          <button
            type="button"
            onClick={toggle}
            className="min-w-0 flex-1 truncate rounded py-0.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gf-fg-muted hover:text-gf-fg"
          >
            {title}
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              title={resolvedAddTitle}
              aria-label={resolvedAddTitle}
              className="inline-flex h-4 w-4 items-center justify-center rounded text-gf-fg-subtle hover:bg-gf-surface-hover/60 hover:text-gf-fg"
            >
              <PlusIcon aria-hidden className="h-3 w-3" />
            </button>
          ) : null}
          {hasMenu && menuItems ? (
            <SidebarMenuButton
              items={menuItems}
              onOpenMenu={openMenu}
              title={t('sidebar.sectionActions', { title })}
            />
          ) : null}
        </div>
        {count !== undefined && (
          <span className="shrink-0 text-[11px] font-medium text-gf-sidebar-count">{count}</span>
        )}
      </div>
      {open ? (
        <div
          className={
            flexible
              ? 'flex min-h-0 flex-1 flex-col pb-1'
              : footer
                ? 'px-1 pb-2'
                : 'px-1 pb-2'
          }
        >
          {children}
        </div>
      ) : null}
      {menuState && (
        <ContextMenu x={menuState.x} y={menuState.y} items={menuState.items} onClose={closeMenu} />
      )}
    </section>
  )
}
