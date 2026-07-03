import { useEffect, useMemo, useRef } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useLogGraph, useBranches, useRepoStatus, useRemotes, useStashList, useTags, useWorkingStatus, useMergeStatus } from '@/hooks/useGit'
import { useTimelineColumnSizes } from '@/hooks/useTimelineColumnSizes'
import { useTimelineColumnVisibility } from '@/hooks/useTimelineColumnVisibility'
import { useCommitContextMenu } from '@/hooks/useCommitContextMenu'
import { useTimelineRefContextMenu } from '@/hooks/useTimelineRefContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'
import { useGitMutations } from '@/hooks/useGitMutations'
import { buildGitGraphLayout } from '@/lib/gitGraphLayout'
import { commitRowHighlightClass } from '@/lib/commitSelection'
import { countWorkingChanges } from '@/lib/workingChanges'
import { timelineRefs } from '@/lib/timelineRefs'
import { commitSearchDimmedHashes, commitSearchRowDimClass } from '@/lib/commitSearch'
import { useCommitSearchStore } from '@/stores/commitSearch'
import { filterTimelineCommits, isStashCommit, resolveStashEntry } from '@/lib/stashCommit'
import { stashContextMenuItems } from '@/lib/sidebarContextMenus'
import {
  hasVisibleColumnAfter,
  TIMELINE_COLUMN_ORDER,
  TIMELINE_COLUMN_WIDTHS,
  timelineColumnLabel,
  timelineHeaderContextMenuItems
} from '@/lib/timelineColumnVisibility'
import {
  formatAuthoredDateTooltip,
  formatTimeSince,
  useRelativeNow
} from '@/lib/formatTimeSince'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { SidebarIconStash } from '@/components/layout/sidebar/SidebarIcons'
import { CommitGraphOverlay } from './CommitGraphOverlay'
import { TimelineCommitColumn, TIMELINE_ROW_HEIGHT } from './TimelineCommitColumn'
import { TimelineRefStack } from './TimelineRefStack'
import { TimelineRefConnectorProvider } from './TimelineRefConnectors'
import { useConnectorAnchor } from './TimelineRefConnectorContext'
import { ColumnResizeHandle } from '@/components/ui/ColumnResizeHandle'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { LoadingRow } from '@/components/ui/Spinner'
import { MergeBranchDialog } from '@/components/BranchSidebar/MergeBranchDialog'
import { CreatePrModal } from '@/components/GitHub/CreatePrModal'
import { AddWorktreeModal } from '@/components/actions/AddWorktreeModal'
import { CheckoutRemoteModal } from '@/components/actions/CheckoutRemoteModal'
import { CreateBranchModal } from '@/components/actions/CreateBranchModal'
import { RenameBranchModal } from '@/components/actions/RenameBranchModal'
import { RenameTagModal } from '@/components/actions/RenameTagModal'
import { SetUpstreamModal } from '@/components/actions/SetUpstreamModal'
import { RebaseSequenceModal } from '@/components/actions/RebaseSequenceModal'
import { CreateTagModal } from '@/components/actions/CreateTagModal'
import { DeleteCommitModal } from '@/components/DetailPanel/DeleteCommitModal'
import { DeleteTagModal } from '@/components/actions/DeleteTagModal'
import { RemoveStaleBranchesModal } from '@/components/DetailPanel/RemoveStaleBranchesModal'
import { RewordCommitModal } from '@/components/DetailPanel/RewordCommitModal'
import { ConfirmDialog } from '@/components/ui/Modal'
import { parseRemoteBranchName } from '@/lib/branchTree'
import type { GitCommit } from '@/lib/types'
import type { TimelineRef } from '@/lib/timelineRefs'
import type { TimelineColumnId } from '@/lib/timelineColumnVisibility'

const RESIZE_HANDLE_WIDTH = 4

function BranchTagRow({
  commit,
  head,
  currentBranch,
  isDetached,
  tagNames,
  remoteNames,
  isSelected,
  isPrimary,
  searchDimClass,
  onRowContextMenu,
  onRefContextMenu,
  handleCommitClick
}: {
  commit: GitCommit
  head: string
  currentBranch: string
  isDetached: boolean
  tagNames: ReadonlySet<string>
  remoteNames: ReadonlySet<string>
  isSelected: boolean
  isPrimary: boolean
  searchDimClass: string
  onRowContextMenu: (event: React.MouseEvent) => void
  onRefContextMenu: (event: React.MouseEvent, timelineRef: TimelineRef) => void
  handleCommitClick: (event: React.MouseEvent) => void
}) {
  const refConnectorAnchor = useConnectorAnchor(`ref:${commit.hash}`)
  const stashConnectorAnchor = useConnectorAnchor(`stash:${commit.hash}`)
  const refs = timelineRefs(commit.refs, tagNames, remoteNames)
  const stash = isStashCommit(commit)

  return (
    <div
      onContextMenu={onRowContextMenu}
      onClick={handleCommitClick}
      className={`flex cursor-pointer items-center gap-1 overflow-visible border-b border-gf-border/30 px-2 hover:bg-gf-bg/50 ${commitRowHighlightClass(isSelected, isPrimary)} ${searchDimClass}`}
      style={{ height: TIMELINE_ROW_HEIGHT }}
    >
      {stash && (
        <span
          ref={stashConnectorAnchor}
          className="inline-flex shrink-0 items-center gap-0.5 rounded border border-sky-500/50 bg-sky-500/15 px-1 py-0.5 text-[10px] leading-none text-sky-300"
        >
          <SidebarIconStash className="h-2.5 w-2.5 shrink-0 opacity-90" />
          stash
        </span>
      )}
      <TimelineRefStack
        refs={refs}
        isHeadCommit={commit.hash === head}
        currentBranch={currentBranch}
        isDetached={isDetached}
        onRefContextMenu={onRefContextMenu}
        connectorAnchorRef={refConnectorAnchor}
      />
    </div>
  )
}

function headerCellClass(columnId: TimelineColumnId): string {
  if (columnId === 'message') return 'min-w-0 flex-1 pl-2'
  if (columnId === 'timeSince') return 'shrink-0 px-2 text-right'
  return 'shrink-0'
}

export function CommitTimeline() {
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
  const showWorkingRow = workingStatus ? !workingStatus.isClean : false
  const showMergeRow = Boolean(
    mergeStatus?.inProgress && (mergeStatus.conflictedPaths.length ?? 0) > 0
  )
  const timelinePrefixRows = (showMergeRow ? 1 : 0) + (showWorkingRow ? 1 : 0)
  const timelinePrefixHeight = timelinePrefixRows * TIMELINE_ROW_HEIGHT
  const changeCounts = useMemo(
    () => (workingStatus ? countWorkingChanges(workingStatus) : null),
    [workingStatus]
  )
  const selection = useSelectionStore((s) => s.timelineSelection)
  const selectedCommitHashes = useSelectionStore((s) => s.selectedCommitHashes)
  const selectedStashIndex = useSelectionStore((s) => s.selectedStashIndex)
  const selectStash = useSelectionStore((s) => s.selectStash)
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const toggleCommitSelection = useSelectionStore((s) => s.toggleCommitSelection)
  const selectCommitRange = useSelectionStore((s) => s.selectCommitRange)

  const searchQuery = useCommitSearchStore((s) => s.query)
  const commits = useMemo(() => filterTimelineCommits(graph?.commits ?? []), [graph?.commits])
  const searchDimmedHashes = useMemo(
    () => commitSearchDimmedHashes(commits, searchQuery),
    [commits, searchQuery]
  )
  const head = repoStatus?.head ?? ''
  const isDetached = repoStatus?.isDetached ?? false
  const currentBranch = isDetached ? '' : (repoStatus?.branch ?? workingStatus?.branch ?? '')
  const selectedHashSet = useMemo(() => new Set(selectedCommitHashes), [selectedCommitHashes])
  const primaryHash = selection?.kind === 'commit' ? selection.id : null

  const handleCommitClick = (commit: GitCommit) => (event: React.MouseEvent) => {
    if (isStashCommit(commit)) {
      const stashEntry = resolveStashEntry(commit, stashes)
      if (stashEntry) {
        selectStash(stashEntry.index, stashEntry.hash)
        return
      }
    }

    if (event.shiftKey) {
      selectCommitRange(commit.hash, commits)
      return
    }
    if (event.metaKey || event.ctrlKey) {
      toggleCommitSelection(commit.hash)
      return
    }
    selectTimelineNode('commit', commit.hash)
  }

  const { stashApply, stashPop, stashDrop } = useGitMutations()
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
    deleteModal,
    setDeleteModal,
    removeStaleModal,
    setRemoveStaleModal,
    interactiveRebaseModal,
    setInteractiveRebaseModal,
    mergeSource,
    setMergeSource,
    worktreeFromCommit,
    setWorktreeFromCommit
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
    invalidatePrs,
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
    onMerge: setMergeSource
  })

  const onRefContextMenu =
    (commit: GitCommit) => (event: React.MouseEvent, timelineRef: TimelineRef) => {
      openRefMenu(event, timelineRef, commit.hash)
    }

  const onRowContextMenu = (commit: GitCommit) => (event: React.MouseEvent) => {
    if (isStashCommit(commit)) {
      const stashEntry = resolveStashEntry(commit, stashes)
      if (stashEntry) {
        const label = stashEntry.message || `(stash@{${stashEntry.index}})`
        openStashMenu(
          event,
          stashContextMenuItems(stashEntry.index, stashEntry.hash, label, {
            onSelect: selectStash,
            onApply: (index) => void stashApply.mutateAsync({ index }),
            onPop: (index) => void stashPop.mutateAsync({ index }),
            onDrop: (index) => void stashDrop.mutateAsync({ index })
          })
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
  const relativeNow = useRelativeNow()
  const scrollRef = useRef<HTMLDivElement>(null)

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
          {commits.map((commit) => {
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
                isSelected={isSelected}
                isPrimary={isPrimary}
                searchDimClass={searchDimClass}
                onRowContextMenu={onRowContextMenu(commit)}
                onRefContextMenu={onRefContextMenu(commit)}
                handleCommitClick={handleCommitClick(commit)}
              />
            )
          })}
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
          <div className="relative overflow-visible">
            <CommitGraphOverlay
              layout={layout}
              prefixRows={timelinePrefixRows}
              showWorkingRow={showWorkingRow}
              workingSelected={selection?.kind === 'working'}
              selectedHash={selectedHash}
              selectedHashes={selectedHashSet}
              dimmedHashes={searchDimmedHashes}
              rowHeight={TIMELINE_ROW_HEIGHT}
              metrics={metrics}
            />
            {commits.map((commit, index) => (
              <div
                key={`graph-hit-${commit.hash}`}
                onContextMenu={onRowContextMenu(commit)}
                onClick={handleCommitClick(commit)}
                className="absolute left-0 right-0 cursor-pointer hover:bg-gf-bg/30"
                style={{
                  top: timelinePrefixHeight + index * TIMELINE_ROW_HEIGHT,
                  height: TIMELINE_ROW_HEIGHT
                }}
              />
            ))}
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
                <span className="font-medium text-orange-300">Merge conflicts detected</span>
                <span className="text-[10px] text-orange-400/90">
                  {mergeStatus.conflictedPaths.length} conflicted
                </span>
              </span>
              <span className="shrink-0 rounded border border-orange-500/30 px-1.5 py-0.5 text-[10px] text-orange-300/90">
                Resolve
              </span>
            </button>
          )}
          {showWorkingRow && (
            <button
              type="button"
              onClick={() => selectTimelineNode('working', 'changes')}
              style={{ height: TIMELINE_ROW_HEIGHT }}
              className={`flex w-full items-center justify-between gap-3 border-b border-gf-border/40 px-2.5 text-left text-[11px] hover:bg-gf-bg/50 ${
                selection?.kind === 'working' ? 'bg-gf-accent/20' : ''
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="font-medium text-amber-300">Uncommitted changes</span>
                {changeCounts && (
                  <span className="flex flex-wrap items-center gap-2 text-[10px]">
                    {changeCounts.modified > 0 && (
                      <span className="text-amber-400">{changeCounts.modified} modified</span>
                    )}
                    {changeCounts.added > 0 && (
                      <span className="text-emerald-400">+{changeCounts.added} added</span>
                    )}
                    {changeCounts.deleted > 0 && (
                      <span className="text-rose-400">-{changeCounts.deleted} deleted</span>
                    )}
                  </span>
                )}
              </span>
              <span className="shrink-0 rounded border border-gf-border-strong px-1.5 py-0.5 text-[10px] text-gf-fg-subtle">
                View Changes
              </span>
            </button>
          )}

          {commits.length === 0 && (
            <p
              className="px-3 text-sm text-gf-fg-subtle"
              style={{ height: TIMELINE_ROW_HEIGHT, lineHeight: `${TIMELINE_ROW_HEIGHT}px` }}
            >
              No commits yet.
            </p>
          )}

          {commits.map((commit) => {
            const { isSelected, isPrimary, searchDimClass } = rowState(commit.hash)
            const stash = isStashCommit(commit)
            return (
              <button
                key={commit.hash}
                type="button"
                onClick={handleCommitClick(commit)}
                onContextMenu={onRowContextMenu(commit)}
                style={{ height: TIMELINE_ROW_HEIGHT }}
                className={`flex w-full items-center gap-2 overflow-hidden border-b border-gf-border/30 px-2.5 text-left hover:bg-gf-bg/50 ${commitRowHighlightClass(isSelected, isPrimary)} ${searchDimClass}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!visibility.hash && (
                      <span
                        className={`shrink-0 font-mono text-[11px] ${stash ? 'text-sky-300' : 'text-gf-fg-subtle'}`}
                      >
                        {commit.shortHash}
                      </span>
                    )}
                    {stash && (
                      <span className="shrink-0 rounded border border-sky-500/50 px-1 py-0.5 text-[10px] leading-none text-sky-300">
                        stash
                      </span>
                    )}
                    {commit.parents.length > 1 && !isStashCommit(commit) && !visibility.parents && (
                      <span className="shrink-0 text-[10px] text-violet-400">merge</span>
                    )}
                    <p className={`min-w-0 truncate text-[12px] ${stash ? 'text-sky-100' : 'text-gf-fg'}`}>
                      {commit.subject}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
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
          onRowContextMenu={onRowContextMenu}
          handleCommitClick={handleCommitClick}
          getCellContent={(commit) => formatTimeSince(commit.author.date, relativeNow)}
          getCellTitle={(commit) => formatAuthoredDateTooltip(commit.author.date)}
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
        onRowContextMenu={onRowContextMenu}
        handleCommitClick={handleCommitClick}
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
    return <p className="p-4 text-sm text-gf-fg-subtle">Open a repository to view commits.</p>
  }

  if (isLoading) return <div className="p-4"><LoadingRow label="Loading commits…" /></div>
  if (error) return <p className="p-4 text-sm text-red-400">{(error as Error).message}</p>

  return (
    <div ref={scrollRef} className={`min-h-0 flex-1 overflow-y-auto ${resizing ? 'select-none' : ''}`}>
      <div className="flex min-w-max flex-col">
        <div
          className="sticky top-0 z-20 flex border-b border-gf-border/70 bg-gf-bg-deep/95 px-2 py-1 text-[10px] uppercase tracking-wide text-gf-fg-subtle backdrop-blur"
          onContextMenu={(event) =>
            openHeaderMenu(event, timelineHeaderContextMenuItems(visibility, toggleColumn))
          }
        >
          {TIMELINE_COLUMN_ORDER.map((columnId) => renderColumnBlock(columnId))}
        </div>

        <div className="flex">
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
          title="Delete branch"
          message={`Delete branch "${pendingDeleteBranch}"?`}
          confirmLabel="Delete"
          busy={deleteBranch.isPending}
          onConfirm={async () => {
            await deleteBranch.mutateAsync({ name: pendingDeleteBranch, force: true })
            setPendingDeleteBranch(null)
          }}
          onCancel={() => setPendingDeleteBranch(null)}
        />
      )}

      {prBranch && repoPath && (
        <CreatePrModal
          open
          onClose={() => setPrBranch(null)}
          defaultHead={prBranch}
          defaultBase={defaultBase}
          onSubmit={async (params) => {
            await window.gitfreddo.githubCreatePullRequest(repoPath, params)
            await invalidatePrs(repoPath)
            show('Pull request created', 'success')
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
          title="Delete remote branch"
          message={`Delete remote branch "${pendingDeleteRemote.name.replace(/^remotes\//, '')}"?`}
          confirmLabel="Delete"
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

      <CreateBranchModal
        open={Boolean(createBranchAt)}
        startPoint={createBranchAt ?? undefined}
        onClose={() => setCreateBranchAt(null)}
      />

      {mergeSource && (
        <MergeBranchDialog sourceBranch={mergeSource} onClose={() => setMergeSource(null)} />
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
