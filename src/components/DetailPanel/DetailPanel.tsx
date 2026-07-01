import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useLogGraph, useRepoStatus, useWorkingStatus } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { GitWorkingTree } from '@/components/WorkingTree/GitWorkingTree'
import { CommitPreview } from '@/components/DetailPanel/CommitPreview'
import { StashPreview } from '@/components/DetailPanel/StashPreview'
import { MultiCommitSelectionBar } from '@/components/DetailPanel/MultiCommitSelectionBar'
import { parseCommitNameStatus } from '@/lib/commitFiles'
import { isStashCommit, resolveStashEntry } from '@/lib/stashCommit'
import { useStashList } from '@/hooks/useGit'
import { useToastStore } from '@/stores/toast'

export function DetailPanel() {
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const selection = useSelectionStore((s) => s.timelineSelection)
  const selectedCommitHashes = useSelectionStore((s) => s.selectedCommitHashes)
  const setPrimaryCommit = useSelectionStore((s) => s.setPrimaryCommit)
  const showCompareCommitRange = useSelectionStore((s) => s.showCompareCommitRange)
  const { data: graph } = useLogGraph(connected)
  const { data: repoStatus } = useRepoStatus(connected)
  const { data: workingStatus } = useWorkingStatus(connected)
  const { data: stashes } = useStashList(connected)
  const { cherryPick, squashCommits } = useGitMutations()
  const showToast = useToastStore((s) => s.show)

  const commit = graph?.commits.find((c) => c.hash === selection?.id)
  const selectedCommits = useMemo(() => {
    if (!graph) return []
    const selected = new Set(selectedCommitHashes)
    return graph.commits.filter((item) => selected.has(item.hash))
  }, [graph, selectedCommitHashes])

  const showOutput = useQuery({
    queryKey: ['repo', repoPath, 'log.show', selection?.id],
    queryFn: async () =>
      window.gitfredo.invoke('log.show', { hash: selection?.id }) as Promise<string>,
    enabled: connected && Boolean(repoPath) && selection?.kind === 'commit' && Boolean(selection.id)
  })

  const changedFiles = useMemo(
    () => (showOutput.data ? parseCommitNameStatus(showOutput.data) : []),
    [showOutput.data]
  )

  const gitBusy = Boolean(
    workingStatus?.rebaseInProgress ||
      workingStatus?.mergeInProgress ||
      workingStatus?.cherryPickInProgress
  )

  async function runBulkAction(
    promise: Promise<unknown>,
    successMessage: string
  ): Promise<void> {
    try {
      await promise
      showToast(successMessage, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

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
    const stashEntry = isStashCommit(commit) ? resolveStashEntry(commit, stashes) : null
    if (stashEntry) {
      return (
        <aside className="flex h-full min-h-0 flex-col border-l border-gf-border">
          <StashPreview stash={stashEntry} />
        </aside>
      )
    }

    const multiSelect = selectedCommitHashes.length > 1

    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-gf-border">
        {multiSelect && (
          <MultiCommitSelectionBar
            commits={selectedCommits}
            allCommits={graph?.commits ?? []}
            primaryHash={commit.hash}
            head={repoStatus?.head ?? ''}
            branch={repoStatus?.branch ?? workingStatus?.branch ?? ''}
            isDetached={repoStatus?.isDetached ?? false}
            isClean={workingStatus?.isClean ?? false}
            gitBusy={gitBusy}
            onSelectPrimary={setPrimaryCommit}
            onCopyAllHashes={(hashes) => {
              void navigator.clipboard.writeText(hashes.join('\n'))
              showToast(`${hashes.length} commit hashes copied.`, 'info')
            }}
            onCompare={showCompareCommitRange}
            onCherryPickAll={(hashes) =>
              void runBulkAction(
                cherryPick.mutateAsync({ hashes }),
                `Cherry-picked ${hashes.length} commits.`
              )
            }
            onSquash={(hashes) =>
              void runBulkAction(
                squashCommits.mutateAsync({ hashes }),
                `Squashed ${hashes.length} commits.`
              )
            }
          />
        )}
        <div className={multiSelect ? 'min-h-0 flex-1' : 'h-full'}>
          <CommitPreview
            commit={commit}
            changedFiles={changedFiles}
            loadingFiles={showOutput.isLoading}
            filesError={showOutput.error}
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
