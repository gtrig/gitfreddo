import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useBranches } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useGitHubRepoContext } from '@/hooks/useGitHubRepos'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'
import { ActionButton, ConfirmDialog } from '@/components/ui/Modal'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { LoadingRow } from '@/components/ui/Spinner'
import { branchColor } from '@/lib/types'
import { CreateBranchModal } from '@/components/actions/CreateBranchModal'
import { MergeBranchDialog } from '@/components/BranchSidebar/MergeBranchDialog'
import { CreatePrModal } from '@/components/GitHub/CreatePrModal'
import { useInvalidateGitHubPullRequests } from '@/hooks/useGitHubPullRequests'
import { useToastStore } from '@/stores/toast'

export function BranchSidebar() {
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: branches, isLoading, error } = useBranches(connected)
  const { data: ghStatus } = useGitHubStatus()
  const { data: ghCtx } = useGitHubRepoContext(repoPath, connected)
  const { checkout, deleteBranch } = useGitMutations()
  const invalidatePrs = useInvalidateGitHubPullRequests()
  const show = useToastStore((s) => s.show)
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const [createOpen, setCreateOpen] = useState(false)
  const [mergeSource, setMergeSource] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [prBranch, setPrBranch] = useState<string | null>(null)

  const defaultBase =
    branches?.find((b) => b.name === 'main' && !b.isRemote)?.name ??
    branches?.find((b) => !b.isRemote)?.name ??
    'main'

  if (!connected) {
    return (
      <aside className="p-4">
        <CollapsibleSection sectionId="sidebar.branches" title="Branches" defaultOpen>
          <p className="text-sm text-gf-fg-subtle">Open a repository to view branches.</p>
        </CollapsibleSection>
      </aside>
    )
  }

  return (
    <aside className="p-4">
      <CollapsibleSection
        sectionId="sidebar.branches"
        title="Branches"
        headerActions={<ActionButton onClick={() => setCreateOpen(true)}>+ New</ActionButton>}
      >
        {isLoading && <LoadingRow />}
        {checkout.isPending && <LoadingRow label="Checking out…" />}
        {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
        <ul className="space-y-1">
          {(branches ?? [])
            .filter((b) => !b.isRemote)
            .map((branch) => (
              <li key={branch.name} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => selectTimelineNode('commit', branch.head)}
                  onDoubleClick={() => {
                    if (!branch.isCurrent) void checkout.mutateAsync({ name: branch.name })
                  }}
                  className={`min-w-0 flex-1 rounded px-2 py-1.5 text-left text-sm ${
                    branch.isCurrent ? 'bg-gf-surface text-white' : 'text-gf-fg-muted hover:bg-gf-bg'
                  }`}
                  title="Click to focus commit · Double-click to checkout"
                >
                  <span className={`font-medium ${branchColor(branch.name)}`}>{branch.name}</span>
                  {branch.isCurrent && (
                    <span className="ml-2 text-xs text-emerald-400">current</span>
                  )}
                  {(branch.ahead > 0 || branch.behind > 0) && (
                    <span className="ml-2 text-xs text-gf-fg-subtle">
                      {branch.ahead > 0 && `↑${branch.ahead}`}
                      {branch.behind > 0 && ` ↓${branch.behind}`}
                    </span>
                  )}
                </button>
                {!branch.isCurrent && ghStatus?.connected && ghCtx && branch.ahead > 0 && (
                  <button
                    type="button"
                    onClick={() => setPrBranch(branch.name)}
                    className="rounded px-1.5 py-1 text-[10px] text-gf-fg-subtle hover:bg-gf-surface-hover"
                    title="Start pull request"
                  >
                    PR
                  </button>
                )}
                {!branch.isCurrent && (
                  <button
                    type="button"
                    onClick={() => setMergeSource(branch.name)}
                    className="rounded px-1.5 py-1 text-[10px] text-gf-fg-subtle hover:bg-gf-surface-hover"
                    title="Merge into current branch"
                  >
                    merge
                  </button>
                )}
                {!branch.isCurrent && (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(branch.name)}
                    className="rounded px-1.5 py-1 text-[10px] text-gf-fg-subtle hover:bg-gf-surface-hover hover:text-red-400"
                    title="Delete branch"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </li>
            ))}
        </ul>
      </CollapsibleSection>

      <CreateBranchModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {mergeSource && (
        <MergeBranchDialog sourceBranch={mergeSource} onClose={() => setMergeSource(null)} />
      )}
      {pendingDelete && (
        <ConfirmDialog
          open
          title="Delete branch"
          message={`Delete branch "${pendingDelete}"?`}
          confirmLabel="Delete"
          busy={deleteBranch.isPending}
          onConfirm={async () => {
            await deleteBranch.mutateAsync({ name: pendingDelete, force: true })
            setPendingDelete(null)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {prBranch && repoPath && (
        <CreatePrModal
          open
          onClose={() => setPrBranch(null)}
          defaultHead={prBranch}
          defaultBase={defaultBase}
          onSubmit={async (params) => {
            await window.gitfredo.githubCreatePullRequest(repoPath, params)
            await invalidatePrs(repoPath)
            show('Pull request created', 'success')
            setPrBranch(null)
          }}
        />
      )}
    </aside>
  )
}
