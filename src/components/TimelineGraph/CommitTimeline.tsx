import { useMemo } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useLogGraph, useRepoStatus, useWorkingStatus } from '@/hooks/useGit'
import { branchColor } from '@/lib/types'
import { buildGitGraphLayout, GRAPH_ROW_HEIGHT } from '@/lib/gitGraphLayout'
import { graphWidth, DEFAULT_GRAPH_METRICS } from '@/lib/graphMetrics'
import { countWorkingChanges } from '@/lib/workingChanges'
import { CommitGraphOverlay } from './CommitGraphOverlay'

const COMPACT_ROW_HEIGHT = Math.max(34, GRAPH_ROW_HEIGHT - 16)

export function CommitTimeline() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: graph, isLoading, error } = useLogGraph(connected)
  const { data: repoStatus } = useRepoStatus(connected)
  const { data: workingStatus } = useWorkingStatus(connected)
  const showWorkingRow = workingStatus ? !workingStatus.isClean : false
  const changeCounts = useMemo(
    () => (workingStatus ? countWorkingChanges(workingStatus) : null),
    [workingStatus]
  )
  const selection = useSelectionStore((s) => s.timelineSelection)
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)

  const commits = graph?.commits ?? []
  const head = repoStatus?.head ?? ''

  const layout = useMemo(() => buildGitGraphLayout(commits, head), [commits, head])
  const graphColumnWidth = graphWidth(Math.max(layout.laneCount, 1), DEFAULT_GRAPH_METRICS)
  const selectedHash = selection?.kind === 'commit' ? selection.id : null

  if (!connected) {
    return <p className="p-4 text-sm text-gf-fg-subtle">Open a repository to view commits.</p>
  }

  if (isLoading) return <p className="p-4 text-sm text-gf-fg-subtle">Loading commits…</p>
  if (error) return <p className="p-4 text-sm text-red-400">{(error as Error).message}</p>

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex min-w-max flex-col">
        <div className="flex">
          <div className="sticky left-0 z-10 shrink-0 bg-gf-bg-deep" style={{ width: graphColumnWidth }}>
            <CommitGraphOverlay
              layout={layout}
              showWorkingRow={showWorkingRow}
              workingSelected={selection?.kind === 'working'}
              selectedHash={selectedHash}
              rowHeight={COMPACT_ROW_HEIGHT}
            />
          </div>

          <div className="min-w-0 flex-1">
            {showWorkingRow && (
              <button
                type="button"
                onClick={() => selectTimelineNode('working', 'changes')}
                style={{ height: COMPACT_ROW_HEIGHT }}
                className={`flex w-full items-center justify-between gap-3 border-b border-gf-border/50 px-3 text-left text-xs hover:bg-gf-bg/50 ${
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
                <span className="shrink-0 rounded border border-gf-border-strong px-2 py-0.5 text-[10px] text-gf-fg-subtle">
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
              const selected = selection?.kind === 'commit' && selection.id === commit.hash
              const branchRef = commit.refs.find((r) => !r.startsWith('HEAD'))
              return (
                <button
                  key={commit.hash}
                  type="button"
                  onClick={() => selectTimelineNode('commit', commit.hash)}
                  style={{ height: COMPACT_ROW_HEIGHT }}
                  className={`flex w-full items-center gap-2 overflow-hidden border-b border-gf-border/40 px-3 text-left hover:bg-gf-bg/50 ${
                    selected ? 'bg-gf-accent/20' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 font-mono text-[11px] text-gf-fg-subtle">{commit.shortHash}</span>
                      {branchRef && (
                        <span
                          className={`shrink-0 rounded-sm border border-gf-border/70 px-1 py-0.5 text-[10px] leading-none ${branchColor(
                            branchRef
                          )}`}
                        >
                          {branchRef}
                        </span>
                      )}
                      {commit.hash === head && (
                        <span className="shrink-0 rounded-sm border border-emerald-500/40 px-1 py-0.5 text-[10px] leading-none text-emerald-400">
                          HEAD
                        </span>
                      )}
                      {commit.parents.length > 1 && (
                        <span className="shrink-0 text-[10px] text-violet-400">merge</span>
                      )}
                      <p className="min-w-0 truncate text-[12px] text-gf-fg">{commit.subject}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
