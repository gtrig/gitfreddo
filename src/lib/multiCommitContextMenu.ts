import type { ContextMenuItem } from '@/components/ui/ContextMenu'
import {
  allSelectedOnBranchHistory,
  anySelectedOnBranchHistory,
  areContiguousCommits,
  selectedCommitsChronological,
  selectionHasMergeCommit
} from '@/lib/commitSelection'
import type { GitCommit, GitWorkingStatus } from '@/lib/types'

export interface MultiCommitContextMenuActions {
  copyAllHashes: (hashes: string[]) => void
  cherryPickAll: (hashes: string[]) => void
  squashSelected: (hashes: string[]) => void
  dropSelected: (commits: GitCommit[]) => void
  compareSelected: (oldestHash: string, newestHash: string, label: string) => void
}

export interface MultiCommitContextMenuContext {
  selectedCommits: GitCommit[]
  head: string
  branch: string
  isDetached: boolean
  allCommits: GitCommit[]
  working: GitWorkingStatus | undefined
  actions: MultiCommitContextMenuActions
}

export function buildMultiCommitContextMenuItems({
  selectedCommits,
  head,
  branch,
  isDetached,
  allCommits,
  working,
  actions
}: MultiCommitContextMenuContext): ContextMenuItem[] {
  if (selectedCommits.length < 2) return []

  const count = selectedCommits.length
  const chronological = selectedCommitsChronological(allCommits, selectedCommits.map((c) => c.hash))
  const hashes = chronological.map((commit) => commit.hash)
  const oldest = chronological[0]!
  const newest = chronological[chronological.length - 1]!
  const workingTreeDirty = working ? !working.isClean : false
  const gitBusy = Boolean(
    working?.rebaseInProgress || working?.mergeInProgress || working?.cherryPickInProgress
  )
  const branchLabel = isDetached ? 'detached HEAD' : branch || 'current branch'
  const onHistory = head ? allSelectedOnBranchHistory(selectedCommits, head, allCommits) : false
  const anyOnHistory = head ? anySelectedOnBranchHistory(selectedCommits, head, allCommits) : false
  const hasMerge = selectionHasMergeCommit(selectedCommits)
  const contiguous = areContiguousCommits(chronological)

  const cherryPickBlocked =
    workingTreeDirty || gitBusy || anyOnHistory || hasMerge
  const squashBlocked =
    workingTreeDirty || gitBusy || isDetached || !onHistory || !contiguous || hasMerge
  const dropBlocked =
    workingTreeDirty || gitBusy || isDetached || !onHistory || !contiguous || hasMerge
  const compareBlocked = gitBusy

  return [
    {
      id: 'multi-heading',
      label: `${count} commits selected`,
      disabled: true,
      onClick: () => {}
    },
    {
      id: 'copy-all-hashes',
      label: 'Copy all commit hashes',
      onClick: () => actions.copyAllHashes(hashes)
    },
    {
      id: 'compare-selected',
      label: `Compare ${oldest.shortHash}..${newest.shortHash}`,
      disabled: compareBlocked,
      onClick: () =>
        actions.compareSelected(
          oldest.hash,
          newest.hash,
          `${count} commits (${oldest.shortHash}..${newest.shortHash})`
        )
    },
    {
      id: 'cherry-pick-all',
      label: anyOnHistory
        ? `Cherry-pick ${count} commits (some already on ${branchLabel})`
        : `Cherry-pick ${count} commits onto ${branchLabel}`,
      disabled: cherryPickBlocked,
      onClick: () => actions.cherryPickAll(hashes)
    },
    {
      id: 'squash-selected',
      label: contiguous
        ? `Squash ${count} commits on ${branchLabel}…`
        : `Squash ${count} commits (selection not contiguous)`,
      disabled: squashBlocked,
      onClick: () => actions.squashSelected(hashes)
    },
    {
      id: 'drop-selected',
      label: contiguous
        ? `Drop ${count} commits from history…`
        : `Drop ${count} commits (selection not contiguous)`,
      disabled: dropBlocked,
      danger: true,
      onClick: () => actions.dropSelected(chronological)
    },
    { id: 'multi-sep-end', label: '', separator: true, onClick: () => {} }
  ]
}
