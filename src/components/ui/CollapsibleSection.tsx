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

function Chevron({ open }: { open: boolean }) {
  return <SidebarIconChevron open={open} className="h-3 w-3 shrink-0 text-gf-fg-subtle" />
}

export interface CollapsibleSectionProps {
  sectionId: string
  title: string
  defaultOpen?: boolean
  headerActions?: ReactNode
  className?: string
  contentClassName?: string
  /** When true, section grows to fill remaining space while open (for file lists). */
  flexible?: boolean
  children: ReactNode
}

export function CollapsibleSection({
  sectionId,
  title,
  defaultOpen = true,
  headerActions,
  className,
  contentClassName,
  flexible = false,
  children
}: CollapsibleSectionProps) {
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

  const sectionClass = flexible && open
    ? `flex min-h-0 flex-1 flex-col ${className ?? ''}`
    : className

  return (
    <section className={sectionClass}>
      <div className={`flex items-center gap-2 ${flexible ? 'shrink-0' : ''}`}>
        <button
          type="button"
          onClick={toggle}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded py-0.5 text-left hover:text-gf-fg"
          aria-expanded={open}
        >
          <Chevron open={open} />
          <span className="truncate text-xs font-semibold uppercase tracking-wide text-gf-fg-subtle">
            {title}
          </span>
        </button>
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
              ? `mt-2 flex min-h-0 flex-1 flex-col ${contentClassName ?? ''}`
              : contentClassName ?? 'mt-3'
          }
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}
