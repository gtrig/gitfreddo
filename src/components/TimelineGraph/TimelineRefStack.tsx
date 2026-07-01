import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TimelineRefBadge } from './TimelineRefBadge'
import { refKey, splitTimelineRefs, type TimelineRef } from '@/lib/timelineRefs'

export function TimelineRefStack({ refs }: { refs: TimelineRef[] }) {
  const { primary, rest } = splitTimelineRefs(refs)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null)

  if (!primary) return null

  const showMenu = () => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuRect(rect)
    setHovered(true)
  }

  const hideMenu = () => {
    setHovered(false)
  }

  if (rest.length === 0) {
    return (
      <span className="min-w-0 max-w-full">
        <TimelineRefBadge timelineRef={primary} />
      </span>
    )
  }

  return (
    <>
      <div
        ref={anchorRef}
        className="min-w-0 max-w-full"
        onMouseEnter={showMenu}
        onMouseLeave={hideMenu}
      >
        <div className="flex min-w-0 max-w-full items-center gap-0.5">
          <TimelineRefBadge timelineRef={primary} />
          <span className="shrink-0 text-[10px] tabular-nums text-gf-fg-subtle">+{rest.length}</span>
        </div>
      </div>
      {hovered && menuRect
        ? createPortal(
            <div
              className="fixed z-50 min-w-max"
              style={{ top: menuRect.bottom + 2, left: menuRect.left }}
              onMouseEnter={showMenu}
              onMouseLeave={hideMenu}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-col gap-0.5 rounded border border-gf-border/80 bg-gf-bg-deep p-1 shadow-lg">
                {rest.map((timelineRef) => (
                  <TimelineRefBadge key={refKey(timelineRef)} timelineRef={timelineRef} />
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
