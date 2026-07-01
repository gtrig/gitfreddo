import { useEffect, useMemo, useRef } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useLogGraph, useRepoStatus, useStashList, useWorkingStatus } from '@/hooks/useGit'
import { useTimelineColumnSizes } from '@/hooks/useTimelineColumnSizes'
import { useCommitContextMenu } from '@/hooks/useCommitContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'
import { useGitMutations } from '@/hooks/useGitMutations'
import { branchColor } from '@/lib/types'
import { buildGitGraphLayout } from '@/lib/gitGraphLayout'
import { commitRowHighlightClass } from '@/lib/commitSelection'
import { countWorkingChanges } from '@/lib/workingChanges'
import { timelineRefs } from '@/lib/timelineRefs'
import { commitSearchDimmedHashes, commitSearchRowDimClass } from '@/lib/commitSearch'
import { useCommitSearchStore } from '@/stores/commitSearch'
import { filterTimelineCommits, isStashCommit, resolveStashEntry } from '@/lib/stashCommit'
import { stashContextMenuItems } from '@/lib/sidebarContextMenus'
import {
  formatAuthoredDateTooltip,
  formatTimeSince,
  useRelativeNow
} from '@/lib/formatTimeSince'
import { CommitGraphOverlay } from './CommitGraphOverlay'
import { ColumnResizeHandle } from '@/components/ui/ColumnResizeHandle'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { LoadingRow } from '@/components/ui/Spinner'
import { CreateBranchModal } from '@/components/actions/CreateBranchModal'
import { CreateTagModal } from '@/components/actions/CreateTagModal'
import { DeleteCommitModal } from '@/components/DetailPanel/DeleteCommitModal'
import { RemoveStaleBranchesModal } from '@/components/DetailPanel/RemoveStaleBranchesModal'
import { RewordCommitModal } from '@/components/DetailPanel/RewordCommitModal'
import type { GitCommit } from '@/lib/types'

const COMPACT_ROW_HEIGHT = 28
const RESIZE_HANDLE_WIDTH = 4
const TIME_SINCE_COLUMN_WIDTH = 88

export function CommitTimeline() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: graph, isLoading, error } = useLogGraph(connected)
  const { data: repoStatus } = useRepoStatus(connected)
  const { data: workingStatus } = useWorkingStatus(connected)
  const { data: stashes } = useStashList(connected)
  const showWorkingRow = workingStatus ? !workingStatus.isClean : false
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
    setRemoveStaleModal
  } = useCommitContextMenu(connected, {
    head,
    branch: repoStatus?.branch ?? workingStatus?.branch ?? '',
    isDetached: repoStatus?.isDetached ?? false,
    commits
  })

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

    const rowTop =
      (showWorkingRow ? COMPACT_ROW_HEIGHT : 0) + firstRow * COMPACT_ROW_HEIGHT
    const rowBottom =
      (showWorkingRow ? COMPACT_ROW_HEIGHT : 0) + (lastRow + 1) * COMPACT_ROW_HEIGHT
    const { scrollTop, clientHeight } = container

    if (rowTop < scrollTop) {
      container.scrollTop = rowTop
    } else if (rowBottom > scrollTop + clientHeight) {
      container.scrollTop = rowBottom - clientHeight
    }
  }, [primaryHash, selectedStashIndex, commits, layout.edges, showWorkingRow])

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

  if (!connected) {
    return <p className="p-4 text-sm text-gf-fg-subtle">Open a repository to view commits.</p>
  }

  if (isLoading) return <div className="p-4"><LoadingRow label="Loading commits…" /></div>
  if (error) return <p className="p-4 text-sm text-red-400">{(error as Error).message}</p>

  return (
    <div ref={scrollRef} className={`min-h-0 flex-1 overflow-y-auto ${resizing ? 'select-none' : ''}`}>
      <div className="flex min-w-max flex-col">
        <div className="sticky top-0 z-20 flex border-b border-gf-border/70 bg-gf-bg-deep/95 px-2 py-1 text-[10px] uppercase tracking-wide text-gf-fg-subtle backdrop-blur">
          <div className="shrink-0" style={{ width: branchTagWidth }}>
            Branch / Tag
          </div>
          <div className="shrink-0" style={{ width: RESIZE_HANDLE_WIDTH }} />
          <div className="shrink-0" style={{ width: graphColumnWidth }}>
            Graph
          </div>
          <div className="shrink-0" style={{ width: RESIZE_HANDLE_WIDTH }} />
          <div className="min-w-0 flex-1 pl-2">Commit message</div>
          <div
            className="shrink-0 px-2 text-right"
            style={{ width: TIME_SINCE_COLUMN_WIDTH }}
          >
            Time since
          </div>
        </div>

        <div className="flex">
          <div
            className="sticky left-0 z-10 shrink-0 border-r border-gf-border/60 bg-gf-bg-deep"
            style={{ width: branchTagWidth }}
          >
            {showWorkingRow && (
              <div
                className="flex items-center px-2 text-[10px] text-gf-fg-subtle"
                style={{ height: COMPACT_ROW_HEIGHT }}
              >
                {workingStatus?.branch ? (
                  <span className="truncate rounded bg-gf-surface px-1 py-0.5">{workingStatus.branch}</span>
                ) : null}
              </div>
            )}
            {commits.map((commit) => {
              const refs = timelineRefs(commit.refs)
              const { isSelected, isPrimary, searchDimClass } = rowState(commit.hash)
              const stash = isStashCommit(commit)

              return (
                <div
                  key={`refs-${commit.hash}`}
                  onContextMenu={onRowContextMenu(commit)}
                  onClick={handleCommitClick(commit)}
                  className={`flex cursor-pointer items-center gap-1 overflow-hidden border-b border-gf-border/30 px-2 hover:bg-gf-bg/50 ${commitRowHighlightClass(isSelected, isPrimary)} ${searchDimClass}`}
                  style={{ height: COMPACT_ROW_HEIGHT }}
                >
                  {stash && (
                    <span className="shrink-0 rounded border border-sky-500/50 bg-sky-500/15 px-1 py-0.5 text-[10px] leading-none text-sky-300">
                      stash
                    </span>
                  )}
                  {refs.slice(0, 2).map((ref) => (
                    <span
                      key={ref}
                      className={`truncate rounded px-1 py-0.5 text-[10px] leading-none ${branchColor(ref)}`}
                      title={ref}
                    >
                      {ref}
                    </span>
                  ))}
                  {refs.length > 2 && (
                    <span className="shrink-0 text-[10px] text-gf-fg-subtle">+{refs.length - 2}</span>
                  )}
                </div>
              )
            })}
          </div>

          <ColumnResizeHandle
            onDrag={onBranchTagResize}
            onResizeStart={() => setResizing(true)}
            onResizeEnd={() => setResizing(false)}
          />

          <div className="sticky left-0 z-10 shrink-0 overflow-visible bg-gf-bg-deep" style={{ width: graphColumnWidth }}>
            <div className="relative overflow-visible">
              <CommitGraphOverlay
                layout={layout}
                showWorkingRow={showWorkingRow}
                workingSelected={selection?.kind === 'working'}
                selectedHash={selectedHash}
                selectedHashes={selectedHashSet}
                dimmedHashes={searchDimmedHashes}
                rowHeight={COMPACT_ROW_HEIGHT}
                metrics={metrics}
              />
              {commits.map((commit, index) => (
                  <div
                    key={`graph-hit-${commit.hash}`}
                    onContextMenu={onRowContextMenu(commit)}
                    onClick={handleCommitClick(commit)}
                    className="absolute left-0 right-0 cursor-pointer hover:bg-gf-bg/30"
                    style={{
                      top: (showWorkingRow ? COMPACT_ROW_HEIGHT : 0) + index * COMPACT_ROW_HEIGHT,
                      height: COMPACT_ROW_HEIGHT
                    }}
                  />
              ))}
            </div>
          </div>

          <ColumnResizeHandle
            onDrag={onGraphLaneResize}
            onResizeStart={() => setResizing(true)}
            onResizeEnd={() => setResizing(false)}
          />

          <div className="min-w-0 flex-1">
            {showWorkingRow && (
              <button
                type="button"
                onClick={() => selectTimelineNode('working', 'changes')}
                style={{ height: COMPACT_ROW_HEIGHT }}
                className={`flex w-full items-center justify-between gap-3 border-b border-gf-border/40 px-2.5 text-left text-[11px] hover:bg-gf-bg/50 ${
                  selection?.kind === 'working' ? 'bg-gf-accent/20' : ''
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-medium text-amber-300">Uncommitted changes</span>
                  {workingStatus?.branch && (
                    <span className="shrink-0 rounded bg-gf-surface px-1 py-0.5 text-[10px] text-gf-fg-muted">
                      {workingStatus.branch}
                    </span>
                  )}
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
                style={{ height: COMPACT_ROW_HEIGHT, lineHeight: `${COMPACT_ROW_HEIGHT}px` }}
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
                  style={{ height: COMPACT_ROW_HEIGHT }}
                  className={`flex w-full items-center gap-2 overflow-hidden border-b border-gf-border/30 px-2.5 text-left hover:bg-gf-bg/50 ${commitRowHighlightClass(isSelected, isPrimary)} ${searchDimClass}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`shrink-0 font-mono text-[11px] ${stash ? 'text-sky-300' : 'text-gf-fg-subtle'}`}
                      >
                        {commit.shortHash}
                      </span>
                      {stash && (
                        <span className="shrink-0 rounded border border-sky-500/50 px-1 py-0.5 text-[10px] leading-none text-sky-300">
                          stash
                        </span>
                      )}
                      {commit.hash === head && (
                        <span className="shrink-0 rounded-sm border border-emerald-500/40 px-1 py-0.5 text-[10px] leading-none text-emerald-400">
                          HEAD
                        </span>
                      )}
                      {commit.parents.length > 1 && !isStashCommit(commit) && (
                        <span className="shrink-0 text-[10px] text-violet-400">merge</span>
                      )}
                      <p className={`min-w-0 truncate text-[12px] ${stash ? 'text-sky-100' : 'text-gf-fg'}`}>
                        {commit.subject}
                        {commit.message && commit.message !== commit.subject && (
                          <span className="ml-1 text-gf-fg-subtle">
                            - {commit.message.replace(commit.subject, '').replace(/\s+/g, ' ').trim()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div
            className="shrink-0 border-l border-gf-border/40 bg-gf-bg-deep"
            style={{ width: TIME_SINCE_COLUMN_WIDTH }}
          >
            {showWorkingRow && (
              <div style={{ height: COMPACT_ROW_HEIGHT }} />
            )}
            {commits.map((commit) => {
              const { isSelected, isPrimary, searchDimClass } = rowState(commit.hash)
              return (
                <div
                  key={`time-${commit.hash}`}
                  onContextMenu={onRowContextMenu(commit)}
                  onClick={handleCommitClick(commit)}
                  title={formatAuthoredDateTooltip(commit.author.date)}
                  className={`flex cursor-pointer items-center justify-end border-b border-gf-border/30 px-2 text-[11px] tabular-nums text-gf-fg-subtle hover:bg-gf-bg/50 ${commitRowHighlightClass(isSelected, isPrimary)} ${searchDimClass}`}
                  style={{ height: COMPACT_ROW_HEIGHT }}
                >
                  <span className="truncate">
                    {formatTimeSince(commit.author.date, relativeNow)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={items} onClose={closeMenu} />}

      {stashMenuState && (
        <ContextMenu
          x={stashMenuState.x}
          y={stashMenuState.y}
          items={stashMenuState.items}
          onClose={closeStashMenu}
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
    </div>
  )
}
