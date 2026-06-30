import { useMemo } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useLogGraph, useRepoStatus } from '@/hooks/useGit'
import { branchColor } from '@/lib/types'
import { buildGitGraphLayout, GRAPH_ROW_HEIGHT } from '@/lib/gitGraphLayout'
import { graphWidth, DEFAULT_GRAPH_METRICS } from '@/lib/graphMetrics'
import { CommitGraphOverlay } from './CommitGraphOverlay'

export function CommitTimeline() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: graph, isLoading, error } = useLogGraph(connected)
  const { data: repoStatus } = useRepoStatus(connected)
  const selection = useSelectionStore((s) => s.timelineSelection)
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)

  const commits = graph?.commits ?? []
  const head = repoStatus?.head ?? ''

  const layout = useMemo(() => buildGitGraphLayout(commits, head), [commits, head])
  const graphColumnWidth = graphWidth(Math.max(layout.laneCount, 1), DEFAULT_GRAPH_METRICS)
  const selectedHash = selection?.kind === 'commit' ? selection.id : null

  if (!connected) {
    return <p className="p-4 text-sm text-zinc-600">Open a repository to view commits.</p>
  }

  if (isLoading) return <p className="p-4 text-sm text-zinc-500">Loading commits…</p>
  if (error) return <p className="p-4 text-sm text-red-400">{(error as Error).message}</p>

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex min-w-max">
        <div className="sticky left-0 z-10 bg-zinc-950" style={{ width: graphColumnWidth }}>
          <CommitGraphOverlay
            layout={layout}
            showWorkingRow
            workingSelected={selection?.kind === 'working'}
            selectedHash={selectedHash}
          />
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => selectTimelineNode('working', 'changes')}
            style={{ height: GRAPH_ROW_HEIGHT }}
            className={`flex w-full items-center gap-3 border-b border-zinc-800/50 px-4 text-left text-sm hover:bg-zinc-900/50 ${
              selection?.kind === 'working' ? 'bg-zinc-800/60' : ''
            }`}
          >
            <span className="font-medium text-amber-300">Uncommitted changes</span>
          </button>

          {commits.length === 0 && (
            <p className="border-b border-zinc-800/50 px-4 py-3 text-sm text-zinc-500">
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
                style={{ minHeight: GRAPH_ROW_HEIGHT }}
                className={`flex w-full items-start gap-3 border-b border-zinc-800/50 px-4 py-2.5 text-left hover:bg-zinc-900/50 ${
                  selected ? 'bg-zinc-800/60' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-zinc-500">{commit.shortHash}</span>
                    {branchRef && (
                      <span className={`text-xs ${branchColor(branchRef)}`}>{branchRef}</span>
                    )}
                    {commit.hash === head && (
                      <span className="text-xs text-emerald-400">HEAD</span>
                    )}
                    {commit.parents.length > 1 && (
                      <span className="text-xs text-violet-400">merge</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-zinc-200">{commit.subject}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {commit.author.name} · {new Date(commit.author.date).toLocaleString()}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
