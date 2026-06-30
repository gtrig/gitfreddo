import { useQuery } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useLogGraph } from '@/hooks/useGit'
import { GitWorkingTree } from '@/components/WorkingTree/GitWorkingTree'

export function DetailPanel() {
  const connected = useWorkspaceStore((s) => s.connected)
  const selection = useSelectionStore((s) => s.timelineSelection)
  const { data: graph } = useLogGraph(connected)

  const commit = graph?.commits.find((c) => c.hash === selection?.id)

  const showOutput = useQuery({
    queryKey: ['repo', 'log.show', selection?.id],
    queryFn: async () =>
      window.gitfredo.invoke('log.show', { hash: selection?.id }) as Promise<string>,
    enabled: connected && selection?.kind === 'commit' && Boolean(selection.id)
  })

  if (!connected) {
    return (
      <aside className="flex h-full items-center justify-center p-4 text-sm text-zinc-600">
        Select a repository tab.
      </aside>
    )
  }

  if (selection?.kind === 'working') {
    return (
      <aside className="h-full overflow-y-auto border-l border-zinc-800">
        <GitWorkingTree />
      </aside>
    )
  }

  if (selection?.kind === 'commit' && commit) {
    return (
      <aside className="h-full overflow-y-auto border-l border-zinc-800 p-4">
        <h2 className="font-mono text-sm text-sky-400">{commit.shortHash}</h2>
        <p className="mt-2 text-sm font-medium text-zinc-100">{commit.subject}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {commit.author.name} &lt;{commit.author.email}&gt;
        </p>
        <p className="text-xs text-zinc-500">{new Date(commit.author.date).toLocaleString()}</p>
        {commit.refs.length > 0 && (
          <p className="mt-2 text-xs text-zinc-400">Refs: {commit.refs.join(', ')}</p>
        )}
        <pre className="mt-4 whitespace-pre-wrap text-xs text-zinc-400">{commit.message}</pre>
        {showOutput.data && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase text-zinc-500">Files changed</h3>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-zinc-400">
              {showOutput.data}
            </pre>
          </div>
        )}
      </aside>
    )
  }

  return (
    <aside className="flex h-full items-center justify-center border-l border-zinc-800 p-4 text-sm text-zinc-600">
      Select a commit or uncommitted changes.
    </aside>
  )
}
