import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useLogGraph, useRepoStatus } from '@/hooks/useGit'
import { branchColor } from '@/lib/types'

export function CommitTimeline() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: graph, isLoading, error } = useLogGraph(connected)
  const { data: repoStatus } = useRepoStatus(connected)
  const selection = useSelectionStore((s) => s.timelineSelection)
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)

  if (!connected) {
    return <p className="p-4 text-sm text-zinc-600">Open a repository to view commits.</p>
  }

  if (isLoading) return <p className="p-4 text-sm text-zinc-500">Loading commits…</p>
  if (error) return <p className="p-4 text-sm text-red-400">{(error as Error).message}</p>

  const commits = graph?.commits ?? []
  const head = repoStatus?.head ?? ''

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <button
        type="button"
        onClick={() => selectTimelineNode('working', 'changes')}
        className={`flex w-full items-center gap-3 border-b border-zinc-800/50 px-4 py-2 text-left text-sm hover:bg-zinc-900/50 ${
          selection?.kind === 'working' ? 'bg-zinc-800/60' : ''
        }`}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/30" />
        <span className="font-medium text-amber-300">Uncommitted changes</span>
      </button>
      {commits.map((commit) => {
        const selected = selection?.kind === 'commit' && selection.id === commit.hash
        const branchRef = commit.refs.find((r) => !r.startsWith('HEAD'))
        return (
          <button
            key={commit.hash}
            type="button"
            onClick={() => selectTimelineNode('commit', commit.hash)}
            className={`flex w-full items-start gap-3 border-b border-zinc-800/50 px-4 py-2.5 text-left hover:bg-zinc-900/50 ${
              selected ? 'bg-zinc-800/60' : ''
            }`}
          >
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                commit.hash === head
                  ? 'bg-emerald-400 ring-2 ring-emerald-400/30'
                  : commit.parents.length > 1
                    ? 'bg-violet-400'
                    : 'bg-sky-500'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-zinc-500">{commit.shortHash}</span>
                {branchRef && (
                  <span className={`text-xs ${branchColor(branchRef)}`}>{branchRef}</span>
                )}
                {commit.hash === head && (
                  <span className="text-xs text-emerald-400">HEAD</span>
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
  )
}
