import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useBranches } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { ActionButton, ConfirmDialog } from '@/components/ui/Modal'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { branchColor } from '@/lib/types'
import { CreateBranchModal } from '@/components/actions/CreateBranchModal'
import { MergeBranchDialog } from '@/components/BranchSidebar/MergeBranchDialog'

export function BranchSidebar() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: branches, isLoading, error } = useBranches(connected)
  const { checkout, deleteBranch } = useGitMutations()
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const [createOpen, setCreateOpen] = useState(false)
  const [mergeSource, setMergeSource] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  if (!connected) {
    return (
      <aside className="p-4">
        <CollapsibleSection sectionId="sidebar.branches" title="Branches" defaultOpen>
          <p className="text-sm text-zinc-600">Open a repository to view branches.</p>
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
        {isLoading && <p className="text-sm text-zinc-500">Loading…</p>}
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
                    branch.isCurrent ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                  title="Click to focus commit · Double-click to checkout"
                >
                  <span className={`font-medium ${branchColor(branch.name)}`}>{branch.name}</span>
                  {branch.isCurrent && (
                    <span className="ml-2 text-xs text-emerald-400">current</span>
                  )}
                  {(branch.ahead > 0 || branch.behind > 0) && (
                    <span className="ml-2 text-xs text-zinc-500">
                      {branch.ahead > 0 && `↑${branch.ahead}`}
                      {branch.behind > 0 && ` ↓${branch.behind}`}
                    </span>
                  )}
                </button>
                {!branch.isCurrent && (
                  <button
                    type="button"
                    onClick={() => setMergeSource(branch.name)}
                    className="rounded px-1.5 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800"
                    title="Merge into current branch"
                  >
                    merge
                  </button>
                )}
                {!branch.isCurrent && (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(branch.name)}
                    className="rounded px-1.5 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                    title="Delete branch"
                  >
                    ×
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
          onConfirm={async () => {
            await deleteBranch.mutateAsync({ name: pendingDelete, force: true })
            setPendingDelete(null)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </aside>
  )
}
