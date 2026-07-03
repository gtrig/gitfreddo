import { useRef, useState, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { TimelineDetachedHeadBadge, TimelineRefBadge } from './TimelineRefBadge'
import { refKey, splitTimelineRefs, type TimelineRef } from '@/lib/timeline/timelineRefs'

function resolveHeadRefs(
  refs: TimelineRef[],
  currentBranch: string
): { primary: TimelineRef | null; rest: TimelineRef[] } {
  const currentRef = refs.find((ref) => ref.kind === 'branch' && ref.label === currentBranch)
  if (!currentRef) {
    return splitTimelineRefs(refs)
  }

  const rest = refs
    .filter((ref) => refKey(ref) !== refKey(currentRef))
    .sort((a, b) => a.sourceOrder - b.sourceOrder)

  return { primary: currentRef, rest }
}

function isCurrentBranchRef(
  timelineRef: TimelineRef,
  currentBranch: string,
  isHeadCommit: boolean,
  isDetached: boolean
): boolean {
  return (
    isHeadCommit &&
    !isDetached &&
    Boolean(currentBranch) &&
    timelineRef.kind === 'branch' &&
    timelineRef.label === currentBranch
  )
}

export function TimelineRefStack({
  refs,
  isHeadCommit = false,
  currentBranch = '',
  isDetached = false,
  onRefContextMenu,
  connectorAnchorRef
}: {
  refs: TimelineRef[]
  isHeadCommit?: boolean
  currentBranch?: string
  isDetached?: boolean
  onRefContextMenu?: (event: React.MouseEvent, timelineRef: TimelineRef) => void
  connectorAnchorRef?: Ref<HTMLSpanElement>
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null)

  const showDetachedHead = isHeadCommit && isDetached
  const { primary, rest } =
    isHeadCommit && !isDetached && currentBranch
      ? resolveHeadRefs(refs, currentBranch)
      : splitTimelineRefs(refs)

  if (!primary && !showDetachedHead) return null

  const showMenu = () => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuRect(rect)
    setHovered(true)
  }

  const hideMenu = () => {
    setHovered(false)
  }

  const primaryIsCurrent = primary
    ? isCurrentBranchRef(primary, currentBranch, isHeadCommit, isDetached)
    : false

  const content =
    rest.length === 0 ? (
      <span ref={connectorAnchorRef} className="flex min-w-0 max-w-full items-center gap-1">
        {showDetachedHead ? <TimelineDetachedHeadBadge /> : null}
        {primary ? (
          <TimelineRefBadge
            timelineRef={primary}
            isCurrent={primaryIsCurrent}
            onContextMenu={onRefContextMenu}
          />
        ) : null}
      </span>
    ) : (
      <span ref={connectorAnchorRef} className="flex min-w-0 max-w-full items-center gap-1">
        {showDetachedHead ? <TimelineDetachedHeadBadge /> : null}
        <div className="flex min-w-0 max-w-full items-center gap-0.5">
          {primary ? (
            <TimelineRefBadge
              timelineRef={primary}
              isCurrent={primaryIsCurrent}
              onContextMenu={onRefContextMenu}
            />
          ) : null}
          <span className="shrink-0 text-[10px] tabular-nums text-gf-fg-subtle">+{rest.length}</span>
        </div>
      </span>
    )

  if (rest.length === 0) {
    return <span className="min-w-0 max-w-full">{content}</span>
  }

  return (
    <>
      <div
        ref={anchorRef}
        className="min-w-0 max-w-full"
        onMouseEnter={showMenu}
        onMouseLeave={hideMenu}
      >
        {content}
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
                  <TimelineRefBadge
                    key={refKey(timelineRef)}
                    timelineRef={timelineRef}
                    isCurrent={isCurrentBranchRef(
                      timelineRef,
                      currentBranch,
                      isHeadCommit,
                      isDetached
                    )}
                    onContextMenu={onRefContextMenu}
                  />
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
