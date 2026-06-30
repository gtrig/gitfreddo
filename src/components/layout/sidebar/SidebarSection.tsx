import { useState, type ReactNode } from 'react'
import { SidebarIconChevron } from '@/components/layout/sidebar/SidebarIcons'

const STORAGE_PREFIX = 'gitfredo:section:'

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
  headerActions?: ReactNode
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
  headerActions,
  footer = false,
  flexible = false,
  children
}: SidebarSectionProps) {
  const [open, setOpen] = useState(() => readStoredOpen(sectionId, defaultOpen))

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

  return (
    <section className={`border-b border-gf-border/60 ${sectionClass}`}>
      <div
        className={`flex items-center gap-1 px-2 ${footer ? 'py-1.5' : 'py-1'} ${flexible ? 'shrink-0' : ''}`}
      >
        <button
          type="button"
          onClick={toggle}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded py-0.5 text-left hover:text-gf-fg"
          aria-expanded={open}
        >
          <SidebarIconChevron open={open} className="h-2.5 w-2.5 shrink-0 text-gf-fg-subtle" />
          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-gf-fg-subtle">
            {icon}
          </span>
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-gf-fg-muted">
            {title}
          </span>
        </button>
        {count !== undefined && (
          <span className="shrink-0 text-[11px] font-medium text-gf-sidebar-count">{count}</span>
        )}
        {headerActions ? (
          <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
            {headerActions}
          </div>
        ) : null}
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
    </section>
  )
}
