import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useLogGraph, useBranches, useRepoStatus, useRemotes, useStashList, useTags, useWorkingStatus, useMergeStatus } from '@/hooks/useGit'
import { useTimelineColumnSizes } from '@/hooks/useTimelineColumnSizes'
import { useTimelineColumnVisibility } from '@/hooks/useTimelineColumnVisibility'
import { useVirtualizer } from '@tanstack/react-virtual'
import { VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'
import { useTimelineDragSelect } from '@/hooks/useTimelineDragSelect'
import { useCommitContextMenu } from '@/hooks/useCommitContextMenu'
import { useTimelineRefContextMenu } from '@/hooks/useTimelineRefContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'
import { useGitMutations } from '@/hooks/useGitMutations'
import { buildGitGraphLayout } from '@/lib/graph/gitGraphLayout'
import { collectFirstParentAncestors } from '@/lib/git/commitReachability'
import { commitRowHighlightClass } from '@/lib/git/commitSelection'
import { countWorkingChanges } from '@/lib/workspace/workingChanges'
import { commitSearchDimmedHashes, commitSearchRowDimClass } from '@/lib/git/commitSearch'
import { useCommitSearchStore } from '@/stores/commitSearch'
import { filterTimelineCommits, isStashCommit, resolveStashEntry } from '@/lib/git/stashCommit'
import {
  filterCommitsForVisibleBranches
} from '@/lib/timeline/branchVisibility'
import { useBranchVisibilityStore } from '@/stores/branchVisibility'
import { stashContextMenuItems } from '@/lib/context-menus/sidebarContextMenus'
import {
  hasVisibleColumnAfter,
  TIMELINE_COLUMN_ORDER,
  TIMELINE_COLUMN_WIDTHS,
  timelineColumnLabel,
  timelineHeaderContextMenuItems
} from '@/lib/timeline/timelineColumnVisibility'
import {
  formatAuthoredDateTooltip,
  formatTimeSince,
  useRelativeNow
} from '@/lib/format/formatTimeSince'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { AnalyzeChangesWithAi } from '@/components/WorkingTree/AnalyzeChangesWithAi'
import { CommitGraphOverlay } from './CommitGraphOverlay'
import { TimelineDragSelectOverlay } from './TimelineDragSelectOverlay'
import { TimelineCommitColumn, TIMELINE_ROW_HEIGHT } from './TimelineCommitColumn'
import { TimelineRefConnectorProvider } from './TimelineRefConnectors'
import { ColumnResizeHandle } from '@/components/Ui/ColumnResizeHandle'
import { BranchTagRow, headerCellClass } from './TimelineBranchTagRow'
import type { TimelineRef } from '@/lib/timeline/timelineRefs'
import {
  buildBranchTracking,
  buildRemoteProviders
} from '@/lib/timeline/timelineRefLocation'
import { REF_STASH_BADGE_STYLE } from './TimelineRefBadge'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { LoadingRow } from '@/components/Ui/Spinner'
import { MergeBranchDialog } from '@/components/Branches/MergeBranchDialog'
import { ForgeCreatePrModal } from '@/components/Forge/ForgeCreatePrModal'
import { AddWorktreeModal } from '@/components/Worktrees/AddWorktreeModal'
import { CheckoutRemoteModal } from '@/components/Branches/CheckoutRemoteModal'
import { CreateBranchModal } from '@/components/Branches/CreateBranchModal'
import { RenameBranchModal } from '@/components/Branches/RenameBranchModal'
import { RenameTagModal } from '@/components/Tags/RenameTagModal'
import { SetUpstreamModal } from '@/components/Branches/SetUpstreamModal'
import { RebaseSequenceModal } from '@/components/Branches/RebaseSequenceModal'
import { CreateTagModal } from '@/components/Tags/CreateTagModal'
import { DeleteCommitModal } from '@/components/DetailPanel/DeleteCommitModal'
import { DeleteTagModal } from '@/components/Tags/DeleteTagModal'
import { RemoveStaleBranchesModal } from '@/components/DetailPanel/RemoveStaleBranchesModal'
import { RewordCommitModal } from '@/components/DetailPanel/RewordCommitModal'
import { ExplainCommitModal } from '@/components/DetailPanel/ExplainCommitWithAi'
import { AddNoteModal } from '@/components/DetailPanel/AddNoteModal'
import { PickMergeParentModal } from '@/components/History/PickMergeParentModal'
import { ConfirmDialog } from '@/components/Ui/Modal'
import { parseRemoteBranchName } from '@/lib/workspace/branchTree'
import type { GitCommit } from '@/lib/types'
import type { TimelineColumnId } from '@/lib/timeline/timelineColumnVisibility'
import {
  resolveCommitDoubleClickCheckout,
  resolveTimelineRefDoubleClickCheckout
} from '@/lib/timeline/timelineRefCheckout'

const RESIZE_HANDLE_WIDTH = 4

export function CommitTimeline() {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: graph, isLoading, error } = useLogGraph(connected)
  const { data: repoStatus } = useRepoStatus(connected)
  const { data: workingStatus } = useWorkingStatus(connected)
  const { data: mergeStatus } = useMergeStatus(connected)
  const { data: stashes } = useStashList(connected)
  const { data: tags } = useTags(connected)
  const { data: branches } = useBranches(connected)
  const { data: remotes } = useRemotes(connected)
  const tagNames = useMemo(() => new Set((tags ?? []).map((tag) => tag.name)), [tags])
  const remoteNames = useMemo(() => new Set((remotes ?? []).map((remote) => remote.name)), [remotes])
  const branchTracking = useMemo(() => buildBranchTracking(branches ?? []), [branches])
  const remoteProviders = useMemo(() => buildRemoteProviders(remotes ?? []), [remotes])
  const showWorkingRow = workingStatus ? !workingStatus.isClean : false
  const showMergeRow = Boolean(mergeStatus?.inProgress)
  const timelinePrefixRows = (showMergeRow ? 1 : 0) + (showWorkingRow ? 1 : 0)
  const timelinePrefixHeight = timelinePrefixRows * TIMELINE_ROW_HEIGHT
  const changeCounts = useMemo(
    () => (workingStatus ? countWorkingChanges(workingStatus) : null),
    [workingStatus]
  )
  const workingStagedPaths = useMemo(
    () => workingStatus?.staged.map((file) => file.path) ?? [],
    [workingStatus?.staged]
  )
  const workingUnstagedPaths = useMemo(() => {
    if (!workingStatus) return []
    return [...workingStatus.unstaged, ...workingStatus.untracked, ...workingStatus.conflicted].map(
      (file) => file.path
    )
  }, [workingStatus])
  const selection = useSelectionStore((s) => s.timelineSelection)
  const selectedCommitHashes = useSelectionStore((s) => s.selectedCommitHashes)
  const selectedStashIndex = useSelectionStore((s) => s.selectedStashIndex)
  const selectStash = useSelectionStore((s) => s.selectStash)
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const toggleCommitSelection = useSelectionStore((s) => s.toggleCommitSelection)
  const selectCommitRange = useSelectionStore((s) => s.selectCommitRange)

  const searchQuery = useCommitSearchStore((s) => s.query)
  const hiddenBranches = useBranchVisibilityStore((s) => s.hiddenBranches)
  const head = repoStatus?.head ?? ''
  const commits = useMemo(() => {
    const filtered = filterTimelineCommits(graph?.commits ?? [])
    return filterCommitsForVisibleBranches(filtered, branches ?? [], hiddenBranches, head)
  }, [graph?.commits, branches, hiddenBranches, head])
  const searchDimmedHashes = useMemo(
    () => commitSearchDimmedHashes(commits, searchQuery),
    [commits, searchQuery]
  )
  const isDetached = repoStatus?.isDetached ?? false
  const currentBranch = isDetached ? '' : (repoStatus?.branch ?? workingStatus?.branch ?? '')
  const selectedHashSet = useMemo(() => new Set(selectedCommitHashes), [selectedCommitHashes])
  const primaryHash = selection?.kind === 'commit' ? selection.id : null
  const [mergeCurrentIntoTarget, setMergeCurrentIntoTarget] = useState<string | null>(null)

  const handleTimelineKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    if (commits.length === 0) return

    event.preventDefault()
    const currentIndex =
      primaryHash != null ? commits.findIndex((commit) => commit.hash === primaryHash) : -1
    const delta = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex =
      currentIndex < 0
        ? event.key === 'ArrowDown'
          ? 0
          : commits.length - 1
        : Math.min(commits.length - 1, Math.max(0, currentIndex + delta))
    const nextCommit = commits[nextIndex]
    if (!nextCommit) return

    if (isStashCommit(nextCommit)) {
      const stashEntry = resolveStashEntry(nextCommit, stashes)
      if (stashEntry) {
        selectStash(stashEntry.index, stashEntry.hash)
      }
      return
    }

    selectTimelineNode('commit', nextCommit.hash)
  }

  const { checkout, stashApply, stashPop, stashDrop } = useGitMutations()

  const handleCommitDoubleClick = (commit: GitCommit) => (event: React.MouseEvent) => {
    event.preventDefault()
    if (isStashCommit(commit)) return

    void checkout.mutateAsync(resolveCommitDoubleClickCheckout(commit.hash))
  }
  const {
    state: stashMenuState,
    openMenu: openStashMenu,
    closeMenu: closeStashMenu
  } = useContextMenu()
  const {
    state: headerMenuState,
    openMenu: openHeaderMenu,
    closeMenu: closeHeaderMenu
  } = useContextMenu()

  const {
    menu,
    items,
    openMenu,
    closeMenu,
    rewordCommit,
    setRewordCommit,
    createBranchAt,
    setCreateBranchAt,
    createTagAt,
    setCreateTagAt,
    noteCommit,
    setNoteCommit,
    mergeParentPick,
    setMergeParentPick,
    confirmMergeParentPick,
    deleteModal,
    setDeleteModal,
    removeStaleModal,
    setRemoveStaleModal,
    interactiveRebaseModal,
    setInteractiveRebaseModal,
    mergeSource,
    setMergeSource,
    worktreeFromCommit,
    setWorktreeFromCommit,
    explainCommits,
    setExplainCommits
  } = useCommitContextMenu(connected, {
    head,
    branch: repoStatus?.branch ?? workingStatus?.branch ?? '',
    isDetached: repoStatus?.isDetached ?? false,
    commits
  })

  const {
    menuState: refMenuState,
    closeMenu: closeRefMenu,
    openRefMenu,
    renameBranch,
    setRenameBranch,
    pendingDeleteBranch,
    setPendingDeleteBranch,
    deleteBranch,
    prBranch,
    setPrBranch,
    defaultBase,
    repoPath,
    provider,
    submitPullRequest,
    show,
    worktreeBranch,
    setWorktreeBranch,
    upstreamBranch,
    setUpstreamBranch,
    localBranches,
    checkoutRemote,
    setCheckoutRemote,
    pendingDeleteRemote,
    setPendingDeleteRemote,
    deleteRemoteBranch,
    renameTag,
    setRenameTag,
    pendingDeleteTag,
    setPendingDeleteTag,
    defaultRemote
  } = useTimelineRefContextMenu({
    connected,
    branches,
    tags,
    remotes,
    currentBranch,
    onSelectCommit: (hash) => selectTimelineNode('commit', hash),
    onMerge: setMergeSource,
    onMergeCurrentInto: setMergeCurrentIntoTarget
  })

  const onRefContextMenu =
    (commit: GitCommit) => (event: React.MouseEvent, timelineRef: TimelineRef) => {
      openRefMenu(event, timelineRef, commit.hash)
    }

  const isCurrentBranchRefOnCommit = (
    timelineRef: TimelineRef,
    commitHash: string
  ): boolean =>
    commitHash === head &&
    !isDetached &&
    Boolean(currentBranch) &&
    timelineRef.kind === 'branch' &&
    timelineRef.label === currentBranch

  const handleRefDoubleClick =
    (commit: GitCommit) => (_event: React.MouseEvent, timelineRef: TimelineRef) => {
      const action = resolveTimelineRefDoubleClickCheckout(timelineRef, {
        isCurrent: isCurrentBranchRefOnCommit(timelineRef, commit.hash)
      })
      if (!action) return

      if (action.kind === 'remote') {
        setCheckoutRemote(action.remoteBranch)
        return
      }

      void checkout.mutateAsync(action.params)
    }

  const onRowContextMenu = (commit: GitCommit) => (event: React.MouseEvent) => {
    if (isStashCommit(commit)) {
      const stashEntry = resolveStashEntry(commit, stashes)
      if (stashEntry) {
        const label = stashEntry.message || `(stash@{${stashEntry.index}})`
        openStashMenu(
          event,
          stashContextMenuItems(
            stashEntry.index,
            stashEntry.hash,
            label,
            {
              onSelect: selectStash,
              onApply: (index) => void stashApply.mutateAsync({ index }),
              onPop: (index) => void stashPop.mutateAsync({ index }),
              onDrop: (index) => void stashDrop.mutateAsync({ index })
            },
            t
          )
        )
        return
      }
    }

    openMenu(commit, event)
  }

  const layout = useMemo(() => buildGitGraphLayout(commits, head), [commits, head])
  const {
    branchTagWidth,
    graphColumnWidth,
    metrics,
    resizing,
    setResizing,
    onBranchTagResize,
    onGraphLaneResize
  } = useTimelineColumnSizes(layout.laneCount)
  const { visibility, toggleColumn } = useTimelineColumnVisibility()
  const showBranchTag = visibility.branchTag
  const showGraph = visibility.graph
  const showBranchTagResize = showBranchTag && showGraph
  const showGraphResize = showGraph && hasVisibleColumnAfter(visibility, 'graph')
  const selectedHash = primaryHash
  // Highlight the first-parent line of the selected commit; fall back to the
  // active branch (HEAD's first-parent line) when nothing is selected. Using
  // first-parent keeps merged-in side branches out of the highlight.
  const ancestorHashes = useMemo(
    () => collectFirstParentAncestors(selectedHash ?? head, commits),
    [selectedHash, head, commits]
  )
  const relativeNow = useRelativeNow()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Maintain scroll offset state so the virtualizer recalculates when the user scrolls.
  // ResizeObserver handles viewport changes. We track scrollTop ourselves because
  // the prefix rows (merge / working) sit above the virtualizer's item area.
  const [scrollTop, setScrollTop] = useState(0)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setScrollTop(el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const timelineVirtualizer = useVirtualizer({
    count: commits.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => TIMELINE_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
    paddingStart: timelinePrefixHeight
  })

  const timelineVirtualItems = timelineVirtualizer.getVirtualItems()
  const vtStart = timelineVirtualItems[0]?.index ?? 0
  const vtEnd =
    timelineVirtualItems.length > 0
      ? timelineVirtualItems[timelineVirtualItems.length - 1]!.index + 1
      : 0
  const virtualWindow = useMemo(
    () => ({
      start: vtStart,
      end: vtEnd,
      topSpacerHeight: vtStart * TIMELINE_ROW_HEIGHT,
      bottomSpacerHeight: Math.max(0, commits.length - vtEnd) * TIMELINE_ROW_HEIGHT
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vtStart, vtEnd, commits.length, scrollTop]
  )

  const dragSelect = useTimelineDragSelect({
    scrollRef,
    commits,
    stashes,
    prefixHeight: timelinePrefixHeight,
    rowHeight: TIMELINE_ROW_HEIGHT,
    actions: {
      selectTimelineNode,
      selectCommitRange,
      selectStash,
      toggleCommitSelection
    }
  })
  const visibleCommits = useMemo(
    () => commits.slice(vtStart, vtEnd),
    [commits, vtStart, vtEnd]
  )

  useEffect(() => {
    if (!primaryHash) return

    const index = commits.findIndex((commit) => commit.hash === primaryHash)
    if (index < 0) return

    let firstRow = index
    let lastRow = index

    const padEdge = layout.edges.find(
      (edge) => edge.kind === 'pad' && (edge.toKey === primaryHash || edge.fromKey === primaryHash)
    )
    if (padEdge) {
      const anchorIndex = commits.findIndex((commit) => commit.hash === padEdge.fromKey)
      const stashIndex = commits.findIndex((commit) => commit.hash === padEdge.toKey)
      if (anchorIndex >= 0) firstRow = Math.min(firstRow, anchorIndex)
      if (stashIndex >= 0) lastRow = Math.max(lastRow, stashIndex)
    }

    const container = scrollRef.current
    if (!container) return

    const rowTop = timelinePrefixHeight + firstRow * TIMELINE_ROW_HEIGHT
    const rowBottom = timelinePrefixHeight + (lastRow + 1) * TIMELINE_ROW_HEIGHT
    const { scrollTop, clientHeight } = container

    if (rowTop < scrollTop) {
      container.scrollTop = rowTop
    } else if (rowBottom > scrollTop + clientHeight) {
      container.scrollTop = rowBottom - clientHeight
    }
  }, [primaryHash, selectedStashIndex, commits, layout.edges, timelinePrefixHeight])

  const rowState = (hash: string) => ({
    isSelected: selectedHashSet.has(hash),
    isPrimary: primaryHash === hash,
    searchDimClass: commitSearchRowDimClass(
      searchDimmedHashes,
      hash,
      selectedHashSet.has(hash),
      primaryHash === hash
    )
  })

  const renderHeaderCell = (columnId: TimelineColumnId) => {
    if (!visibility[columnId]) return null

    const width =
      columnId === 'branchTag'
        ? branchTagWidth
        : columnId === 'graph'
          ? graphColumnWidth
          : TIMELINE_COLUMN_WIDTHS[columnId]

    return (
      <div
        key={`header-${columnId}`}
        className={headerCellClass(columnId)}
        style={width ? { width } : undefined}
      >
        {timelineColumnLabel(columnId)}
      </div>
    )
  }

  const renderDataColumn = (columnId: TimelineColumnId, embeddedInGraphBlock = false) => {
    if (!visibility[columnId]) return null

    const stickyClass = embeddedInGraphBlock ? '' : 'sticky left-0 z-10 '

    if (columnId === 'branchTag') {
      return (
        <div
          key="column-branchTag"
          className={`${stickyClass}shrink-0 border-r border-gf-border/60 ${embeddedInGraphBlock ? '' : 'bg-gf-bg-deep'}`}
          style={{ width: branchTagWidth }}
        >
          {showMergeRow && <div style={{ height: TIMELINE_ROW_HEIGHT }} />}
          {showWorkingRow && <div style={{ height: TIMELINE_ROW_HEIGHT }} />}
          {virtualWindow.topSpacerHeight > 0 && (
            <div style={{ height: virtualWindow.topSpacerHeight }} aria-hidden />
          )}
          {visibleCommits.map((commit) => {
            const { isSelected, isPrimary, searchDimClass } = rowState(commit.hash)

            return (
              <BranchTagRow
                key={`refs-${commit.hash}`}
                commit={commit}
                head={head}
                currentBranch={currentBranch}
                isDetached={isDetached}
                tagNames={tagNames}
                remoteNames={remoteNames}
                branchTracking={branchTracking}
                remoteProviders={remoteProviders}
                isSelected={isSelected}
                isPrimary={isPrimary}
                searchDimClass={searchDimClass}
                hiddenBranches={hiddenBranches}
                onRefContextMenu={onRefContextMenu(commit)}
                onRefDoubleClick={handleRefDoubleClick(commit)}
                t={t}
              />
            )
          })}
          {virtualWindow.bottomSpacerHeight > 0 && (
            <div style={{ height: virtualWindow.bottomSpacerHeight }} aria-hidden />
          )}
        </div>
      )
    }

    if (columnId === 'graph') {
      return (
        <div
          key="column-graph"
          className={`${stickyClass}shrink-0 overflow-visible ${embeddedInGraphBlock ? '' : 'bg-gf-bg-deep'}`}
          style={{ width: graphColumnWidth }}
        >
          <div
            className="relative overflow-visible"
            style={{ height: dragSelect.commitRowAreaTop + dragSelect.commitRowAreaHeight }}
          >
            <CommitGraphOverlay
              layout={layout}
              prefixRows={timelinePrefixRows}
              showWorkingRow={showWorkingRow}
              workingSelected={selection?.kind === 'working'}
              selectedHash={selectedHash}
              selectedHashes={selectedHashSet}
              ancestorHashes={ancestorHashes}
              dimmedHashes={searchDimmedHashes}
              rowHeight={TIMELINE_ROW_HEIGHT}
              metrics={metrics}
              visibleRowRange={virtualWindow}
            />
          </div>
        </div>
      )
    }

    if (columnId === 'message') {
      return (
        <div key="column-message" className="min-w-0 flex-1">
          {showMergeRow && mergeStatus && (
            <button
              type="button"
              onClick={() => selectTimelineNode('merge', 'conflicts')}
              style={{ height: TIMELINE_ROW_HEIGHT }}
              className={`flex w-full items-center justify-between gap-3 border-b border-gf-border/40 px-2.5 text-left text-[11px] hover:bg-gf-bg/50 ${
                selection?.kind === 'merge' ? 'bg-orange-500/15' : ''
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0 text-orange-400" aria-hidden />
                <span className="font-medium text-orange-300">{t('timeline.mergeConflictsDetected')}</span>
                <span className="text-[10px] text-orange-400/90">
                  {t('timeline.conflictedCount', { count: mergeStatus.conflictedPaths.length })}
                </span>
              </span>
              <span className="shrink-0 rounded border border-orange-500/30 px-1.5 py-0.5 text-[10px] text-orange-300/90">
                {t('timeline.resolve')}
              </span>
            </button>
          )}
          {showWorkingRow && (
            <div
              style={{ height: TIMELINE_ROW_HEIGHT }}
              className={`flex w-full items-center justify-between gap-2 border-b border-gf-border/40 px-2.5 text-[11px] ${
                selection?.kind === 'working' ? 'bg-gf-accent/20' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => selectTimelineNode('working', 'changes')}
                className="flex min-w-0 flex-1 items-center gap-2 text-left hover:bg-gf-bg/50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-medium text-amber-300">{t('timeline.uncommittedChanges')}</span>
                  {changeCounts && (
                    <span className="flex flex-wrap items-center gap-2 text-[10px]">
                      {changeCounts.modified > 0 && (
                        <span className="text-amber-400">
                          {t('timeline.modified', { count: changeCounts.modified })}
                        </span>
                      )}
                      {changeCounts.added > 0 && (
                        <span className="text-emerald-400">
                          {t('timeline.added', { count: changeCounts.added })}
                        </span>
                      )}
                      {changeCounts.deleted > 0 && (
                        <span className="text-rose-400">
                          {t('timeline.deleted', { count: changeCounts.deleted })}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-1.5">
                <AnalyzeChangesWithAi
                  branch={workingStatus?.branch ?? currentBranch}
                  stagedPaths={workingStagedPaths}
                  unstagedPaths={workingUnstagedPaths}
                  variant="pill"
                />
                <button
                  type="button"
                  onClick={() => selectTimelineNode('working', 'changes')}
                  className="shrink-0 rounded border border-gf-border-strong px-1.5 py-0.5 text-[10px] text-gf-fg-subtle hover:bg-gf-bg/50"
                >
                  {t('timeline.viewChanges')}
                </button>
              </div>
            </div>
          )}

          {commits.length === 0 && (
            <p
              className="px-3 text-sm text-gf-fg-subtle"
              style={{ height: TIMELINE_ROW_HEIGHT, lineHeight: `${TIMELINE_ROW_HEIGHT}px` }}
            >
              {t('timeline.noCommitsYet')}
            </p>
          )}

          {virtualWindow.topSpacerHeight > 0 && (
            <div style={{ height: virtualWindow.topSpacerHeight }} aria-hidden />
          )}

          {visibleCommits.map((commit) => {
            const { isSelected, isPrimary, searchDimClass } = rowState(commit.hash)
            const stash = isStashCommit(commit)
            return (
              <div
                key={commit.hash}
                style={{ height: TIMELINE_ROW_HEIGHT }}
                className={`pointer-events-none flex w-full items-center gap-2 overflow-hidden border-b border-gf-border/30 px-2.5 text-left ${commitRowHighlightClass(isSelected, isPrimary)} ${searchDimClass}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!visibility.hash && (
                      <span
                        className={`shrink-0 font-mono text-[11px] ${stash ? 'text-gf-ref-stash-fg' : 'text-gf-fg-subtle'}`}
                      >
                        {commit.shortHash}
                      </span>
                    )}
                    {stash && (
                      <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] leading-none ${REF_STASH_BADGE_STYLE}`}>
                        {t('timeline.stash')}
                      </span>
                    )}
                    {commit.parents.length > 1 && !isStashCommit(commit) && !visibility.parents && (
                      <span className="shrink-0 text-[10px] text-violet-400">{t('timeline.merge')}</span>
                    )}
                    <p className={`min-w-0 truncate text-[12px] ${stash ? 'text-gf-ref-stash-fg' : 'text-gf-fg'}`}>
                      {commit.subject}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          {virtualWindow.bottomSpacerHeight > 0 && (
            <div style={{ height: virtualWindow.bottomSpacerHeight }} aria-hidden />
          )}
        </div>
      )
    }

    if (columnId === 'timeSince') {
      return (
        <TimelineCommitColumn
          key="column-timeSince"
          columnId="timeSince"
          width={TIMELINE_COLUMN_WIDTHS.timeSince ?? 88}
          align="right"
          prefixRows={timelinePrefixRows}
          commits={commits}
          rowState={rowState}
          getCellContent={(commit) => formatTimeSince(commit.author.date, relativeNow)}
          getCellTitle={(commit) => formatAuthoredDateTooltip(commit.author.date)}
          virtualWindow={virtualWindow}
        />
      )
    }

    const width = TIMELINE_COLUMN_WIDTHS[columnId]
    if (!width) return null

    return (
      <TimelineCommitColumn
        key={`column-${columnId}`}
        columnId={columnId}
        width={width}
        prefixRows={timelinePrefixRows}
        commits={commits}
        rowState={rowState}
        virtualWindow={virtualWindow}
      />
    )
  }

  const renderColumnBlock = (columnId: TimelineColumnId) => (
    <>
      {renderHeaderCell(columnId)}
      {columnId === 'branchTag' && showBranchTagResize && (
        <div className="shrink-0" style={{ width: RESIZE_HANDLE_WIDTH }} />
      )}
      {columnId === 'graph' && showGraphResize && (
        <div className="shrink-0" style={{ width: RESIZE_HANDLE_WIDTH }} />
      )}
    </>
  )

  const renderBodyBlock = (columnId: TimelineColumnId) => (
    <>
      {renderDataColumn(columnId)}
      {columnId === 'branchTag' && showBranchTagResize && (
        <ColumnResizeHandle
          onDrag={onBranchTagResize}
          onResizeStart={() => setResizing(true)}
          onResizeEnd={() => setResizing(false)}
        />
      )}
      {columnId === 'graph' && showGraphResize && (
        <ColumnResizeHandle
          onDrag={onGraphLaneResize}
          onResizeStart={() => setResizing(true)}
          onResizeEnd={() => setResizing(false)}
        />
      )}
    </>
  )

  const renderGraphBodyBlock = () => {
    const branchTagColumn = showBranchTag ? renderDataColumn('branchTag', true) : null
    const graphColumn = showGraph ? renderDataColumn('graph', true) : null
    const branchResize =
      showBranchTagResize ? (
        <ColumnResizeHandle
          key="resize-branch-tag"
          onDrag={onBranchTagResize}
          onResizeStart={() => setResizing(true)}
          onResizeEnd={() => setResizing(false)}
        />
      ) : null
    const graphResize =
      showGraphResize ? (
        <ColumnResizeHandle
          key="resize-graph"
          onDrag={onGraphLaneResize}
          onResizeStart={() => setResizing(true)}
          onResizeEnd={() => setResizing(false)}
        />
      ) : null

    if (showBranchTag && showGraph) {
      return (
        <TimelineRefConnectorProvider
          key="timeline-graph-block"
          commits={commits}
          layout={layout}
          head={head}
          currentBranch={currentBranch}
          isDetached={isDetached}
          tagNames={tagNames}
          remoteNames={remoteNames}
          branchTagWidth={branchTagWidth}
          resizeGap={showBranchTagResize ? RESIZE_HANDLE_WIDTH : 0}
          prefixRows={timelinePrefixRows}
          rowHeight={TIMELINE_ROW_HEIGHT}
          metrics={metrics}
          dimmedHashes={searchDimmedHashes}
          selectedHash={selectedHash}
          selectedHashes={selectedHashSet}
        >
          {branchTagColumn}
          {branchResize}
          {graphColumn}
          {graphResize}
        </TimelineRefConnectorProvider>
      )
    }

    return (
      <>
        {branchTagColumn}
        {branchResize}
        {graphColumn}
        {graphResize}
      </>
    )
  }

  if (!connected) {
    return <p className="p-4 text-sm text-gf-fg-subtle">{t('timeline.openRepoPrompt')}</p>
  }

  if (isLoading) return <div className="p-4"><LoadingRow label={t('timeline.loadingCommits')} /></div>
  if (error) return <p className="p-4 text-sm text-red-400">{(error as Error).message}</p>

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      role="region"
      aria-label={t('timeline.commitList')}
      onKeyDown={handleTimelineKeyDown}
      className={`min-h-0 flex-1 overflow-y-auto outline-none focus-visible:ring-1 focus-visible:ring-gf-accent/60 ${resizing || dragSelect.isDragging ? 'select-none' : ''}`}
    >
      <div className="flex min-w-max flex-col">
        <div
          className="sticky top-0 z-20 flex border-b border-gf-border/70 bg-gf-bg-deep/95 px-2 py-1 text-[10px] uppercase tracking-wide text-gf-fg-subtle backdrop-blur"
          onContextMenu={(event) =>
            openHeaderMenu(event, timelineHeaderContextMenuItems(visibility, toggleColumn))
          }
        >
          {TIMELINE_COLUMN_ORDER.map((columnId) => renderColumnBlock(columnId))}
        </div>

        <div className="relative flex">
          <TimelineDragSelectOverlay
            dragSelect={dragSelect}
            onRowContextMenu={onRowContextMenu}
            onCommitDoubleClick={handleCommitDoubleClick}
          />
          {TIMELINE_COLUMN_ORDER.map((columnId) => {
            if (columnId === 'branchTag') {
              return renderGraphBodyBlock()
            }
            if (columnId === 'graph') {
              return null
            }
            return renderBodyBlock(columnId)
          })}
        </div>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={items} onClose={closeMenu} />}

      {headerMenuState && (
        <ContextMenu
          x={headerMenuState.x}
          y={headerMenuState.y}
          items={headerMenuState.items}
          onClose={closeHeaderMenu}
        />
      )}

      {stashMenuState && (
        <ContextMenu
          x={stashMenuState.x}
          y={stashMenuState.y}
          items={stashMenuState.items}
          onClose={closeStashMenu}
        />
      )}

      {refMenuState && (
        <ContextMenu
          x={refMenuState.x}
          y={refMenuState.y}
          items={refMenuState.items}
          onClose={closeRefMenu}
        />
      )}

      {renameBranch && (
        <RenameBranchModal
          open
          currentName={renameBranch}
          onClose={() => setRenameBranch(null)}
        />
      )}

      {pendingDeleteBranch && (
        <ConfirmDialog
          open
          title={t('sidebar.deleteBranch')}
          message={t('sidebar.deleteBranchConfirm', { name: pendingDeleteBranch })}
          confirmLabel={t('common.delete')}
          busy={deleteBranch.isPending}
          onConfirm={async () => {
            await deleteBranch.mutateAsync({ name: pendingDeleteBranch, force: true })
            setPendingDeleteBranch(null)
          }}
          onCancel={() => setPendingDeleteBranch(null)}
        />
      )}

      {prBranch && repoPath && provider && (
        <ForgeCreatePrModal
          provider={provider}
          open
          onClose={() => setPrBranch(null)}
          defaultHead={prBranch}
          defaultBase={defaultBase}
          onSubmit={async (params) => {
            await submitPullRequest(params)
            show(t('sidebar.pullRequestCreated'), 'success')
            setPrBranch(null)
          }}
        />
      )}

      {worktreeBranch && (
        <AddWorktreeModal
          open
          initialBranch={worktreeBranch}
          onClose={() => setWorktreeBranch(null)}
        />
      )}

      {upstreamBranch && (
        <SetUpstreamModal
          open
          branchName={upstreamBranch}
          currentUpstream={localBranches.find((branch) => branch.name === upstreamBranch)?.upstream}
          onClose={() => setUpstreamBranch(null)}
        />
      )}

      {checkoutRemote && (
        <CheckoutRemoteModal
          open
          remoteBranch={checkoutRemote}
          onClose={() => setCheckoutRemote(null)}
        />
      )}

      {pendingDeleteRemote && (
        <ConfirmDialog
          open
          title={t('sidebar.deleteRemoteBranch')}
          message={t('sidebar.deleteRemoteBranchConfirm', {
            name: pendingDeleteRemote.name.replace(/^remotes\//, '')
          })}
          confirmLabel={t('common.delete')}
          busy={deleteRemoteBranch.isPending}
          onConfirm={async () => {
            const parsed = parseRemoteBranchName(pendingDeleteRemote.name)
            if (parsed) {
              await deleteRemoteBranch.mutateAsync({
                remote: parsed.remote,
                branch: parsed.branch
              })
            }
            setPendingDeleteRemote(null)
          }}
          onCancel={() => setPendingDeleteRemote(null)}
        />
      )}

      {renameTag && !renameTag.isRemote && (
        <RenameTagModal open currentName={renameTag.name} onClose={() => setRenameTag(null)} />
      )}

      {pendingDeleteTag && (
        <DeleteTagModal
          open
          tag={pendingDeleteTag.tag}
          remote={pendingDeleteTag.remote}
          defaultRemote={defaultRemote}
          onClose={() => setPendingDeleteTag(null)}
        />
      )}

      {rewordCommit && (
        <RewordCommitModal
          commit={rewordCommit}
          open
          onClose={() => setRewordCommit(null)}
        />
      )}

      {explainCommits && explainCommits.length > 0 && (
        <ExplainCommitModal
          commits={explainCommits}
          open
          onClose={() => setExplainCommits(null)}
        />
      )}

      {noteCommit && (
        <AddNoteModal commit={noteCommit} open onClose={() => setNoteCommit(null)} />
      )}

      {mergeParentPick && (
        <PickMergeParentModal
          open
          commit={mergeParentPick.commit}
          commits={commits}
          action={mergeParentPick.action}
          onClose={() => setMergeParentPick(null)}
          onConfirm={confirmMergeParentPick}
        />
      )}

      <CreateBranchModal
        open={Boolean(createBranchAt)}
        startPoint={createBranchAt ?? undefined}
        onClose={() => setCreateBranchAt(null)}
      />

      {mergeSource && (
        <MergeBranchDialog sourceBranch={mergeSource} onClose={() => setMergeSource(null)} />
      )}

      {mergeCurrentIntoTarget && currentBranch && (
        <MergeBranchDialog
          sourceBranch={currentBranch}
          targetBranch={mergeCurrentIntoTarget}
          onClose={() => setMergeCurrentIntoTarget(null)}
        />
      )}

      {worktreeFromCommit && (
        <AddWorktreeModal
          open
          initialCommit={worktreeFromCommit.hash}
          initialCommitShort={worktreeFromCommit.shortHash}
          initialBranch={worktreeFromCommit.branchName}
          onClose={() => setWorktreeFromCommit(null)}
        />
      )}

      <CreateTagModal
        open={Boolean(createTagAt)}
        target={createTagAt ?? undefined}
        onClose={() => setCreateTagAt(null)}
      />

      {deleteModal && (
        <DeleteCommitModal
          action={deleteModal.action}
          commits={deleteModal.commits}
          ahead={workingStatus?.ahead ?? 0}
          open
          initialMode={deleteModal.initialMode}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {removeStaleModal && (
        <RemoveStaleBranchesModal
          open
          seedHash={removeStaleModal.seedHash}
          seedHashes={removeStaleModal.seedHashes}
          onClose={() => setRemoveStaleModal(null)}
        />
      )}

      {interactiveRebaseModal && (
        <RebaseSequenceModal
          open
          commits={interactiveRebaseModal.commits}
          onClose={() => setInteractiveRebaseModal(null)}
        />
      )}
    </div>
  )
}
