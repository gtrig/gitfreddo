import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useLogGraph } from '@/hooks/useGit'
import { GitWorkingTree } from '@/components/WorkingTree/GitWorkingTree'
import { CommitPreview } from '@/components/DetailPanel/CommitPreview'
import { MultiCommitSelectionBar } from '@/components/DetailPanel/MultiCommitSelectionBar'
import { parseCommitNameStatus } from '@/lib/commitFiles'

export function DetailPanel() {
  const connected = useWorkspaceStore((s) => s.connected)
  const selection = useSelectionStore((s) => s.timelineSelection)
  const selectedCommitHashes = useSelectionStore((s) => s.selectedCommitHashes)
  const setPrimaryCommit = useSelectionStore((s) => s.setPrimaryCommit)
  const { data: graph } = useLogGraph(connected)

  const commit = graph?.commits.find((c) => c.hash === selection?.id)
  const selectedCommits = useMemo(() => {
    if (!graph) return []
    const selected = new Set(selectedCommitHashes)
    return graph.commits.filter((item) => selected.has(item.hash))
  }, [graph, selectedCommitHashes])

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
      <aside className="flex h-full min-h-0 flex-col border-l border-gf-border">
        <GitWorkingTree />
      </aside>
    )
  }

  if (selection?.kind === 'commit' && commit) {
    const multiSelect = selectedCommitHashes.length > 1

    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-gf-border">
        {multiSelect && (
          <MultiCommitSelectionBar
            commits={selectedCommits}
            primaryHash={commit.hash}
            onSelectPrimary={setPrimaryCommit}
          />
        )}
        <div className={multiSelect ? 'min-h-0 flex-1' : 'h-full'}>
          <CommitPreview
            commit={commit}
            changedFiles={changedFiles}
            loadingFiles={showOutput.isLoading}
          />
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex h-full items-center justify-center border-l border-gf-border p-4 text-sm text-gf-fg-subtle">
      Select a commit or uncommitted changes.
    </aside>
  )
}
