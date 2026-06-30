import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useLogGraph } from '@/hooks/useGit'
import { GitWorkingTree } from '@/components/WorkingTree/GitWorkingTree'
import { CommitPreview } from '@/components/DetailPanel/CommitPreview'
import { parseCommitNameStatus } from '@/lib/commitFiles'

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

  const changedFiles = useMemo(
    () => (showOutput.data ? parseCommitNameStatus(showOutput.data) : []),
    [showOutput.data]
  )

  if (!connected) {
    return (
      <aside className="flex h-full items-center justify-center p-4 text-sm text-gf-fg-subtle">
        Select a repository tab.
      </aside>
    )
  }

  if (selection?.kind === 'working') {
    return (
      <aside className="h-full overflow-y-auto border-l border-gf-border">
        <GitWorkingTree />
      </aside>
    )
  }

  if (selection?.kind === 'commit' && commit) {
    return (
      <CommitPreview
        commit={commit}
        changedFiles={changedFiles}
        loadingFiles={showOutput.isLoading}
      />
    )
  }

  return (
    <aside className="flex h-full items-center justify-center border-l border-gf-border p-4 text-sm text-gf-fg-subtle">
      Select a commit or uncommitted changes.
    </aside>
  )
}
