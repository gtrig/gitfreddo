import { commitRowHighlightClass } from '@/lib/git/commitSelection'
import { timelineRefs } from '@/lib/timeline/timelineRefs'
import { filterTimelineRefsForVisibility } from '@/lib/timeline/branchVisibility'
import { isStashCommit } from '@/lib/git/stashCommit'
import { SidebarIconStash } from '@/components/Layout/sidebar/SidebarIcons'
import { TimelineRefStack } from './TimelineRefStack'
import { REF_STASH_BADGE_STYLE } from './TimelineRefBadge'
import { TIMELINE_ROW_HEIGHT } from './TimelineCommitColumn'
import { useConnectorAnchor } from './TimelineRefConnectorContext'
import type { ForgeProvider } from '@/lib/forge/detect'
import type { GitCommit } from '@/lib/types'
import type { TimelineRef } from '@/lib/timeline/timelineRefs'
import type { TimelineColumnId } from '@/lib/timeline/timelineColumnVisibility'

export interface BranchTagRowProps {
  commit: GitCommit
  head: string
  currentBranch: string
  isDetached: boolean
  tagNames: ReadonlySet<string>
  remoteNames: ReadonlySet<string>
  branchUpstreams: ReadonlyMap<string, string | undefined>
  remoteProviders: ReadonlyMap<string, ForgeProvider | null>
  isSelected: boolean
  isPrimary: boolean
  searchDimClass: string
  hiddenBranches: ReadonlySet<string>
  onRefContextMenu: (event: React.MouseEvent, timelineRef: TimelineRef) => void
  onRefDoubleClick: (event: React.MouseEvent, timelineRef: TimelineRef) => void
  t: (key: string, options?: Record<string, unknown>) => string
}

export function BranchTagRow({
  commit,
  head,
  currentBranch,
  isDetached,
  tagNames,
  remoteNames,
  branchUpstreams,
  remoteProviders,
  isSelected,
  isPrimary,
  searchDimClass,
  hiddenBranches,
  onRefContextMenu,
  onRefDoubleClick,
  t
}: BranchTagRowProps) {
  const refConnectorAnchor = useConnectorAnchor(`ref:${commit.hash}`)
  const stashConnectorAnchor = useConnectorAnchor(`stash:${commit.hash}`)
  const refs = filterTimelineRefsForVisibility(
    timelineRefs(commit.refs, tagNames, remoteNames),
    hiddenBranches
  )
  const stash = isStashCommit(commit)

  return (
    <div
      className={`flex items-center gap-1 overflow-visible border-b border-gf-border/30 px-2 pointer-events-none ${commitRowHighlightClass(isSelected, isPrimary)} ${searchDimClass}`}
      style={{ height: TIMELINE_ROW_HEIGHT }}
    >
      {stash && (
        <span
          ref={stashConnectorAnchor}
          className={`inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[10px] leading-none ${REF_STASH_BADGE_STYLE}`}
        >
          <SidebarIconStash className="h-2.5 w-2.5 shrink-0 opacity-90" />
          {t('timeline.stash')}
        </span>
      )}
      <div className="pointer-events-auto">
        <TimelineRefStack
          refs={refs}
          isHeadCommit={commit.hash === head}
          currentBranch={currentBranch}
          isDetached={isDetached}
          branchUpstreams={branchUpstreams}
          remoteProviders={remoteProviders}
          onRefContextMenu={onRefContextMenu}
          onRefDoubleClick={onRefDoubleClick}
          connectorAnchorRef={refConnectorAnchor}
        />
      </div>
    </div>
  )
}

export function headerCellClass(columnId: TimelineColumnId): string {
  if (columnId === 'message') return 'min-w-0 flex-1 pl-2'
  if (columnId === 'timeSince') return 'shrink-0 px-2 text-right'
  return 'shrink-0'
}
