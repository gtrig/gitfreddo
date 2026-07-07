import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useBranches, useRemotes, useRepoStatus, useStashList, useSubmoduleList, useTags, useWorktreeList } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { CreateBranchModal } from '@/components/Branches/CreateBranchModal'
import { SidebarFilter } from '@/components/Layout/sidebar/SidebarFilter'
import {
  LocalBranchesSection,
  RemoteBranchesSection
} from '@/components/Layout/sidebar/LocalBranchesSection'
import { StashesSection } from '@/components/Layout/sidebar/StashesSection'
import { WorktreesSection } from '@/components/Layout/sidebar/WorktreesSection'
import { SubmodulesSection } from '@/components/Layout/sidebar/SubmodulesSection'
import { TagsSection } from '@/components/Layout/sidebar/TagsSection'
import { SidebarPullRequestsSection } from '@/components/Layout/sidebar/SidebarPullRequestsSection'
import { SidebarIssuesSection } from '@/components/Layout/sidebar/SidebarIssuesSection'
import {
  buildLocalBranchTree,
  countBranchTreeNodes,
  filterBranchTree,
  matchesFilter
} from '@/lib/workspace/branchTree'

export function RepoSidebar() {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: branches, isLoading, error } = useBranches(connected)
  const { data: repoStatus } = useRepoStatus(connected)
  const { data: remotes } = useRemotes(connected)
  const { data: stashes, isLoading: stashesLoading, error: stashesError } = useStashList(connected)
  const {
    data: worktrees,
    isLoading: worktreesLoading,
    error: worktreesError
  } = useWorktreeList(connected)
  const {
    data: submodules,
    isLoading: submodulesLoading,
    error: submodulesError
  } = useSubmoduleList(connected)
  const { data: tags, isLoading: tagsLoading, error: tagsError } = useTags(connected)
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
    const localCount = countBranchTreeNodes(localTree) + (repoStatus?.isDetached && matchesFilter('HEAD', filter) ? 1 : 0)
    const remoteCount = (branches ?? []).filter(
      (b) =>
        b.isRemote &&
        matchesFilter(b.name.replace(/^remotes\//, ''), filter)
    ).length
    const stashCount = (stashes ?? []).filter((s) =>
      matchesFilter(s.message || `stash@{${s.index}}`, filter)
    ).length
    const worktreeCount = (worktrees ?? []).filter((wt) => {
      const label = wt.branch ?? (wt.isDetached ? '(detached)' : wt.path)
      return matchesFilter(label, filter) || matchesFilter(wt.path, filter)
    }).length
    const submoduleCount = (submodules ?? []).filter((sm) =>
      matchesFilter(sm.path, filter) || matchesFilter(sm.url, filter)
    ).length
    const tagCount = (tags ?? []).filter((tag) => matchesFilter(tag.name, filter)).length
    return localCount + remoteCount + stashCount + worktreeCount + submoduleCount + tagCount
  }, [branches, connected, filter, repoStatus?.isDetached, stashes, submodules, tags, worktrees])

  if (!connected) {
    return (
      <aside className="flex h-full flex-col">
        <div className="px-2 py-3">
          <p className="text-xs text-gf-fg-subtle">{t('sidebar.openRepoPrompt')}</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-gf-border/60 px-2 pt-2">
        <p className="pb-1.5 text-[11px] text-gf-sidebar-count">
          {t('sidebar.viewing', { count: viewingCount })}
        </p>
        <SidebarFilter value={filter} onChange={setFilter} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <LocalBranchesSection
          branches={branches}
          filter={filter}
          isLoading={isLoading}
          error={error as Error | null}
          checkoutPending={checkout.isPending}
          isDetached={repoStatus?.isDetached ?? false}
          head={repoStatus?.head}
          onSelectCommit={(hash) => selectTimelineNode('commit', hash)}
          onCheckout={(params) => void checkout.mutateAsync(params)}
          onCreateBranch={() => setCreateOpen(true)}
        />
        <RemoteBranchesSection
          branches={branches}
          remotes={remotes}
          filter={filter}
          isLoading={isLoading}
          error={error as Error | null}
          onSelectCommit={(hash) => selectTimelineNode('commit', hash)}
        />
        <WorktreesSection
          worktrees={worktrees}
          filter={filter}
          isLoading={worktreesLoading}
          error={worktreesError as Error | null}
        />
        <SubmodulesSection
          submodules={submodules}
          filter={filter}
          isLoading={submodulesLoading}
          error={submodulesError as Error | null}
        />
        <StashesSection
          stashes={stashes}
          filter={filter}
          isLoading={stashesLoading}
          error={stashesError as Error | null}
          selectedIndex={selectedStashIndex}
          onSelect={selectStash}
        />
        <TagsSection
          tags={tags}
          remotes={remotes}
          filter={filter}
          isLoading={tagsLoading}
          error={tagsError as Error | null}
          onSelectCommit={(hash) => selectTimelineNode('commit', hash)}
        />
      </div>

      <div className="mt-auto max-h-[45%] shrink-0 overflow-y-auto border-t border-gf-border/60">
        <SidebarPullRequestsSection />
        <SidebarIssuesSection />
      </div>

      <CreateBranchModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </aside>
  )
}
