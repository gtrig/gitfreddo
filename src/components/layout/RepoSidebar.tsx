import { useMemo, useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useBranches, useStashList } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { CreateBranchModal } from '@/components/actions/CreateBranchModal'
import { SidebarFilter } from '@/components/layout/sidebar/SidebarFilter'
import {
  LocalBranchesSection,
  RemoteBranchesSection
} from '@/components/layout/sidebar/LocalBranchesSection'
import { StashesSection } from '@/components/layout/sidebar/StashesSection'
import { SidebarPullRequestsSection } from '@/components/layout/sidebar/SidebarPullRequestsSection'
import { SidebarIssuesSection } from '@/components/layout/sidebar/SidebarIssuesSection'
import {
  buildLocalBranchTree,
  countBranchTreeNodes,
  filterBranchTree,
  matchesFilter
} from '@/lib/branchTree'

export function RepoSidebar() {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: branches, isLoading, error } = useBranches(connected)
  const { data: stashes, isLoading: stashesLoading, error: stashesError } = useStashList(connected)
  const { checkout } = useGitMutations()
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const selectedStashIndex = useSelectionStore((s) => s.selectedStashIndex)
  const selectStash = useSelectionStore((s) => s.selectStash)

  const [filter, setFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const viewingCount = useMemo(() => {
    if (!connected) return 0
    const local = branches?.filter((b) => !b.isRemote) ?? []
    const localTree = filterBranchTree(buildLocalBranchTree(local), filter)
    const localCount = countBranchTreeNodes(localTree)
    const remoteCount = (branches ?? []).filter(
      (b) =>
        b.isRemote &&
        matchesFilter(b.name.replace(/^remotes\//, ''), filter)
    ).length
    const stashCount = (stashes ?? []).filter((s) =>
      matchesFilter(s.message || `stash@{${s.index}}`, filter)
    ).length
    return localCount + remoteCount + stashCount
  }, [branches, connected, filter, stashes])

  if (!connected) {
    return (
      <aside className="flex h-full flex-col">
        <div className="px-2 py-3">
          <p className="text-xs text-gf-fg-subtle">Open a repository to browse branches and stashes.</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-gf-border/60 px-2 pt-2">
        <p className="pb-1.5 text-[11px] text-gf-sidebar-count">Viewing {viewingCount}</p>
        <SidebarFilter value={filter} onChange={setFilter} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <LocalBranchesSection
          branches={branches}
          filter={filter}
          isLoading={isLoading}
          error={error as Error | null}
          checkoutPending={checkout.isPending}
          onSelectCommit={(hash) => selectTimelineNode('commit', hash)}
          onCheckout={(name) => void checkout.mutateAsync({ name })}
          onCreateBranch={() => setCreateOpen(true)}
        />
        <RemoteBranchesSection
          branches={branches}
          filter={filter}
          isLoading={isLoading}
          error={error as Error | null}
          onSelectCommit={(hash) => selectTimelineNode('commit', hash)}
        />
        <StashesSection
          stashes={stashes}
          filter={filter}
          isLoading={stashesLoading}
          error={stashesError as Error | null}
          selectedIndex={selectedStashIndex}
          onSelect={selectStash}
        />
      </div>

      <div className="mt-auto shrink-0 border-t border-gf-border/60">
        <SidebarPullRequestsSection />
        <SidebarIssuesSection />
      </div>

      <CreateBranchModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </aside>
  )
}
