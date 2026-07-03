import type { TFunction } from 'i18next'
import type { ContextMenuItem } from '@/components/ui/ContextMenu'
import {
  allSelectedOnBranchHistory,
  anySelectedOnBranchHistory,
  areContiguousCommits,
  areContiguousOnBranchHeadLine,
  selectedCommitsChronological,
  selectionHasMergeCommit
} from '@/lib/commitSelection'
import type { GitCommit, GitWorkingStatus } from '@/lib/types'

export interface MultiCommitContextMenuActions {
  copyAllHashes: (hashes: string[]) => void
  cherryPickAll: (hashes: string[]) => void
  cherryPickAllNoCommit: (hashes: string[]) => void
  squashSelected: (hashes: string[]) => void
  interactiveRebase: (commits: GitCommit[]) => void
  dropSelected: (commits: GitCommit[]) => void
  removeStaleSelected: (commits: GitCommit[]) => void
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
  t?: TFunction
}

export function buildMultiCommitContextMenuItems({
  selectedCommits,
  head,
  branch,
  isDetached,
  allCommits,
  working,
  actions,
  t
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
  const branchLabel = isDetached
    ? t
      ? t('contextMenu.detachedHead')
      : 'detached HEAD'
    : branch || (t ? t('contextMenu.currentBranch') : 'current branch')
  const onHistory = head ? allSelectedOnBranchHistory(selectedCommits, head, allCommits) : false
  const anyOnHistory = head ? anySelectedOnBranchHistory(selectedCommits, head, allCommits) : false
  const hasMerge = selectionHasMergeCommit(selectedCommits)
  const contiguous = areContiguousCommits(chronological)

  const cherryPickBlocked =
    workingTreeDirty || gitBusy || anyOnHistory || hasMerge
  const squashBlocked =
    workingTreeDirty || gitBusy || isDetached || !onHistory || !contiguous || hasMerge
  const interactiveRebaseBlocked =
    workingTreeDirty || gitBusy || isDetached || !onHistory || !contiguous || hasMerge
  const onHeadLine = head
    ? areContiguousOnBranchHeadLine(selectedCommits, head, allCommits)
    : false
  const allOffBranch = head ? !anyOnHistory : false
  const dropHardBlocked = gitBusy || !onHistory || !onHeadLine || hasMerge
  const compareBlocked = gitBusy

  function dropLabel(): string {
    if (hasMerge) {
      return t
        ? t('contextMenu.dropCommitsMergeNotSupported', { count })
        : `Drop ${count} commits (merge commits not supported)`
    }
    if (!onHistory) {
      return t
        ? t('contextMenu.dropCommitsNotOnBranch', { count })
        : `Drop ${count} commits (not on current branch)`
    }
    if (!onHeadLine) {
      return t
        ? t('contextMenu.dropCommitsNotContiguous', { count })
        : `Drop ${count} commits (not contiguous on branch)`
    }
    return t
      ? t('contextMenu.dropCommitsFromHistory', { count })
      : `Drop ${count} commits from history…`
  }

  return [
    {
      id: 'multi-heading',
      label: t ? t('contextMenu.commitsSelected', { count }) : `${count} commits selected`,
      disabled: true,
      onClick: () => {}
    },
    {
      id: 'copy-all-hashes',
      label: t ? t('contextMenu.copyAllCommitHashes') : 'Copy all commit hashes',
      onClick: () => actions.copyAllHashes(hashes)
    },
    {
      id: 'compare-selected',
      label: t
        ? t('contextMenu.compareRange', { oldest: oldest.shortHash, newest: newest.shortHash })
        : `Compare ${oldest.shortHash}..${newest.shortHash}`,
      disabled: compareBlocked,
      onClick: () =>
        actions.compareSelected(
          oldest.hash,
          newest.hash,
          t
            ? t('detail.compareLabel', {
                count,
                oldest: oldest.shortHash,
                newest: newest.shortHash
              })
            : `${count} commits (${oldest.shortHash}..${newest.shortHash})`
        )
    },
    {
      id: 'cherry-pick-all',
      label: anyOnHistory
        ? t
          ? t('contextMenu.cherryPickAllAlready', { count, branch: branchLabel })
          : `Cherry-pick ${count} commits (some already on ${branchLabel})`
        : t
          ? t('contextMenu.cherryPickAllOnto', { count, branch: branchLabel })
          : `Cherry-pick ${count} commits onto ${branchLabel}`,
      disabled: cherryPickBlocked,
      onClick: () => actions.cherryPickAll(hashes)
    },
    {
      id: 'cherry-pick-all-no-commit',
      label: anyOnHistory
        ? t
          ? t('contextMenu.cherryPickAllNoCommitAlready', { count, branch: branchLabel })
          : `Cherry-pick ${count} without commit (some already on ${branchLabel})`
        : t
          ? t('contextMenu.cherryPickAllNoCommitOnto', { count, branch: branchLabel })
          : `Cherry-pick ${count} without commit onto ${branchLabel}`,
      disabled: cherryPickBlocked,
      onClick: () => actions.cherryPickAllNoCommit(hashes)
    },
    {
      id: 'interactive-rebase',
      label: contiguous
        ? t
          ? t('contextMenu.interactiveRebaseContiguous', { count, branch: branchLabel })
          : `Interactive rebase ${count} commits on ${branchLabel}…`
        : t
          ? t('contextMenu.interactiveRebaseNotContiguous')
          : 'Interactive rebase (selection not contiguous)',
      disabled: interactiveRebaseBlocked,
      onClick: () => actions.interactiveRebase(chronological)
    },
    {
      id: 'squash-selected',
      label: contiguous
        ? t
          ? t('contextMenu.squashContiguous', { count, branch: branchLabel })
          : `Squash ${count} commits on ${branchLabel}…`
        : t
          ? t('contextMenu.squashNotContiguous', { count })
          : `Squash ${count} commits (selection not contiguous)`,
      disabled: squashBlocked,
      onClick: () => actions.squashSelected(hashes)
    },
    {
      id: 'drop-selected',
      label: dropLabel(),
      disabled: dropHardBlocked,
      danger: true,
      onClick: () => actions.dropSelected(chronological)
    },
    {
      id: 'remove-stale-selected',
      label: allOffBranch
        ? t
          ? t('contextMenu.removeStaleHistory', { count })
          : `Remove stale branch history (${count} commits)…`
        : t
          ? t('contextMenu.removeStaleHistorySpansBranches')
          : 'Remove stale branch history (selection spans branches)…',
      disabled: gitBusy || !allOffBranch,
      danger: true,
      onClick: () => actions.removeStaleSelected(selectedCommits)
    },
    { id: 'multi-sep-end', label: '', separator: true, onClick: () => {} }
  ]
}
