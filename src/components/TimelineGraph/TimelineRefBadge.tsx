import { TagIcon } from '@heroicons/react/24/outline'
import {
  SidebarIconBranch,
  SidebarIconOrigin
} from '@/components/layout/sidebar/SidebarIcons'
import { branchColor } from '@/lib/types'
import type { TimelineRef, TimelineRefKind } from '@/lib/timelineRefs'

const BADGE_BASE =
  'inline-flex max-w-full shrink items-center gap-0.5 truncate rounded border px-1 py-0.5 text-[10px] leading-none'

const KIND_STYLES: Record<TimelineRefKind, string> = {
  branch: 'border-gf-border-strong/70 bg-gf-surface/90',
  remote: 'border-violet-500/35 bg-violet-500/10 text-violet-300',
  tag: 'border-white/25 bg-white/10 text-white'
}

function RefIcon({ kind }: { kind: TimelineRefKind }) {
  switch (kind) {
    case 'tag':
      return (
        <TagIcon
          aria-hidden
          className="h-3 w-3 shrink-0 stroke-[2] text-white"
        />
      )
    case 'remote':
      return <SidebarIconOrigin className="h-2.5 w-2.5 shrink-0 opacity-90" />
    default:
      return <SidebarIconBranch className="h-2.5 w-2.5 shrink-0 opacity-90" />
  }
}

export function TimelineRefBadge({ timelineRef }: { timelineRef: TimelineRef }) {
  const textColor = timelineRef.kind === 'branch' ? branchColor(timelineRef.label) : ''

  return (
    <span
      className={`${BADGE_BASE} ${KIND_STYLES[timelineRef.kind]} ${textColor}`}
      title={timelineRef.fullRef}
    >
      <RefIcon kind={timelineRef.kind} />
      <span className="truncate">{timelineRef.label}</span>
    </span>
  )
}
