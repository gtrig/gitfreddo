import { TagIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import {
  SidebarIconBranch,
  SidebarIconOrigin
} from '@/components/Layout/sidebar/SidebarIcons'
import { CurrentHeadCheck } from '@/components/Ui/CurrentHeadCheck'
import { branchColor } from '@/lib/types'
import type { TimelineRef, TimelineRefKind } from '@/lib/timeline/timelineRefs'

export function TimelineHeadCheck() {
  return <CurrentHeadCheck />
}

const BADGE_BASE =
  'inline-flex max-w-full shrink items-center gap-0.5 truncate rounded border px-1 py-0.5 text-[10px] leading-none'

const KIND_STYLES: Record<TimelineRefKind, string> = {
  branch: 'border-gf-border-strong/70 bg-gf-surface/90',
  remote:
    'border-[var(--gf-ref-remote-border)] bg-[var(--gf-ref-remote-bg)] text-gf-ref-remote-fg',
  tag: 'border-[var(--gf-ref-tag-border)] bg-[var(--gf-ref-tag-bg)] text-gf-ref-tag-fg'
}

export const REF_STASH_BADGE_STYLE =
  'border-[var(--gf-ref-stash-border)] bg-[var(--gf-ref-stash-bg)] text-gf-ref-stash-fg'

function RefIcon({ kind }: { kind: TimelineRefKind }) {
  switch (kind) {
    case 'tag':
      return (
        <TagIcon
          aria-hidden
          className="h-3 w-3 shrink-0 stroke-[2] text-gf-ref-tag-fg"
        />
      )
    case 'remote':
      return <SidebarIconOrigin className="h-2.5 w-2.5 shrink-0 opacity-90" />
    default:
      return <SidebarIconBranch className="h-2.5 w-2.5 shrink-0 opacity-90" />
  }
}

export function TimelineDetachedHeadBadge() {
  const { t } = useTranslation()

  return (
    <span
      className={`${BADGE_BASE} border-gf-border-strong/70 bg-gf-surface/90 text-gf-ref-detached-fg`}
      title={t('timeline.detachedHead')}
    >
      <SidebarIconBranch className="h-2.5 w-2.5 shrink-0 opacity-90" />
      <span className="truncate">HEAD</span>
    </span>
  )
}

export function TimelineRefBadge({
  timelineRef,
  isCurrent = false,
  onContextMenu,
  onDoubleClick
}: {
  timelineRef: TimelineRef
  isCurrent?: boolean
  onContextMenu?: (event: React.MouseEvent, timelineRef: TimelineRef) => void
  onDoubleClick?: (event: React.MouseEvent) => void
}) {
  const textColor = timelineRef.kind === 'branch' ? branchColor(timelineRef.label) : ''

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-0.5">
      {isCurrent ? <TimelineHeadCheck /> : null}
      <span
        className={`${BADGE_BASE} ${KIND_STYLES[timelineRef.kind]} ${textColor}`}
        title={timelineRef.fullRef}
        onContextMenu={
          onContextMenu
            ? (event) => {
                onContextMenu(event, timelineRef)
              }
            : undefined
        }
        onDoubleClick={onDoubleClick}
      >
        <RefIcon kind={timelineRef.kind} />
        <span className="truncate">{timelineRef.label}</span>
      </span>
    </span>
  )
}
