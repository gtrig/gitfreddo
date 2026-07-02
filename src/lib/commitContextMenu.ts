import type { ResetMode } from '@/components/DetailPanel/DeleteCommitModal'
import type { ContextMenuItem } from '@/components/ui/ContextMenu'
import {
  isAheadOfHead,
  isBehindHead,
  isOnCurrentBranchHistory
} from '@/lib/commitReachability'
import { selectedCommitsInTimeline } from '@/lib/commitSelection'
import { buildMultiCommitContextMenuItems, type MultiCommitContextMenuActions } from '@/lib/multiCommitContextMenu'
import { isStashCommit } from '@/lib/stashCommit'
import { timelineRefs } from '@/lib/timelineRefs'
import type { GitCommit, GitWorkingStatus } from '@/lib/types'

export interface CommitContextMenuActions extends MultiCommitContextMenuActions {
  selectCommit: (hash: string) => void
  copyHash: (hash: string) => void
  copyShortHash: (shortHash: string) => void
  checkout: (ref: string) => void
  mergeBranch: (branchName: string) => void
  createWorktreeFromCommit: (commit: GitCommit) => void
  createBranch: (hash: string) => void
  createTag: (hash: string) => void
  reword: (commit: GitCommit) => void
  rebaseOnto: (hash: string) => void
  cherryPick: (hash: string) => void
  cherryPickNoCommit: (hash: string) => void
  reset: (mode: 'soft' | 'mixed' | 'hard', hash: string) => void
  deleteHead: (mode: ResetMode) => void
  dropCommits: (commits: GitCommit[]) => void
  revertCommit: (commit: GitCommit) => void
  removeStaleHistory: (commit: GitCommit) => void
  rebaseContinue: () => void
  rebaseAbort: () => void
  rebaseSkip: () => void
  mergeContinue: () => void
  mergeAbort: () => void
  cherryPickContinue: () => void
  cherryPickAbort: () => void
  cherryPickSkip: () => void
}

export interface CommitContextMenuContext {
  commit: GitCommit
  head: string
  branch: string
  isDetached: boolean
  commits: GitCommit[]
  working: GitWorkingStatus | undefined
  selectedCommitId: string | null
  selectedCount: number
  selectedHashes: string[]
  actions: CommitContextMenuActions
}

function localBranchRefs(commit: GitCommit): string[] {
  return timelineRefs(commit.refs)
    .filter((ref) => ref.kind === 'branch')
    .map((ref) => ref.label)
}

export function buildCommitContextMenuItems({
  commit,
  head,
  branch,
  isDetached,
  commits,
  working,
  selectedCommitId,
  selectedCount,
  selectedHashes,
  actions
}: CommitContextMenuContext): ContextMenuItem[] {
  if (isStashCommit(commit)) {
    return []
  }

  const items: ContextMenuItem[] = []
  const short = commit.shortHash
  const isHead = commit.hash === head
  const isMerge = commit.parents.length > 1
  const workingTreeDirty = working ? !working.isClean : false
  const gitBusy = Boolean(
    working?.rebaseInProgress || working?.mergeInProgress || working?.cherryPickInProgress
  )
  const onBranchHistory = head ? isOnCurrentBranchHistory(commit.hash, head, commits) : false
  const behindHead = head ? isBehindHead(commit.hash, head, commits) : false
  const aheadOfHead = head ? isAheadOfHead(commit.hash, head, commits) : false
  const inHistory = onBranchHistory
  const checkoutBranches = localBranchRefs(commit).filter((name) => name !== branch || !isHead)
  const mergeBranches =
    !isDetached && branch && selectedCount === 1
      ? localBranchRefs(commit).filter((name) => name !== branch)
      : []

  const branchLabel = isDetached ? 'detached HEAD' : branch || 'current branch'

  if (working?.rebaseInProgress) {
    items.push(
      { id: 'rebase-continue', label: 'Continue rebase', onClick: actions.rebaseContinue },
      { id: 'rebase-skip', label: 'Skip commit', onClick: actions.rebaseSkip },
      { id: 'rebase-abort', label: 'Abort rebase', danger: true, onClick: actions.rebaseAbort },
      { id: 'sep-rebase', label: '', separator: true, onClick: () => {} }
    )
  }

  if (working?.cherryPickInProgress) {
    items.push(
      {
        id: 'cherry-pick-continue',
        label: 'Continue cherry-pick',
        onClick: actions.cherryPickContinue
      },
      { id: 'cherry-pick-skip', label: 'Skip commit', onClick: actions.cherryPickSkip },
      {
        id: 'cherry-pick-abort',
        label: 'Abort cherry-pick',
        danger: true,
        onClick: actions.cherryPickAbort
      },
      { id: 'sep-cherry-pick', label: '', separator: true, onClick: () => {} }
    )
  }

  if (working?.mergeInProgress) {
    items.push(
      { id: 'merge-continue', label: 'Continue merge', onClick: actions.mergeContinue },
      { id: 'merge-abort', label: 'Abort merge', danger: true, onClick: actions.mergeAbort },
      { id: 'sep-merge', label: '', separator: true, onClick: () => {} }
    )
  }

  items.push({
    id: 'view',
    label:
      selectedCount > 1
        ? `View commit (${selectedCount} selected)`
        : selectedCommitId === commit.hash
          ? 'View commit (selected)'
          : 'View commit',
    onClick: () => actions.selectCommit(commit.hash)
  })

  items.push(
    { id: 'copy-hash', label: 'Copy commit hash', onClick: () => actions.copyHash(commit.hash) },
    {
      id: 'copy-short',
      label: 'Copy short hash',
      onClick: () => actions.copyShortHash(commit.shortHash)
    },
    { id: 'sep-copy', label: '', separator: true, onClick: () => {} }
  )

  if (selectedCount > 1) {
    const selectedCommits = selectedCommitsInTimeline(commits, selectedHashes)
    items.push(
      ...buildMultiCommitContextMenuItems({
        selectedCommits,
        head,
        branch,
        isDetached,
        allCommits: commits,
        working,
        actions
      })
    )
  }

  if (isHead) {
    items.push({
      id: 'checkout',
      label: `Checked out at HEAD${branch && !isDetached ? ` (${branch})` : ''}`,
      disabled: true,
      onClick: () => {}
    })
  } else if (checkoutBranches.length > 0) {
    for (const branchName of checkoutBranches) {
      items.push({
        id: `checkout-${branchName}`,
        label: `Checkout ${branchName}`,
        disabled: gitBusy,
        onClick: () => actions.checkout(branchName)
      })
    }
  } else {
    items.push({
      id: 'checkout',
      label: 'Checkout commit (detached HEAD)',
      disabled: gitBusy,
      onClick: () => actions.checkout(commit.hash)
    })
  }

  if (mergeBranches.length > 0) {
    for (const branchName of mergeBranches) {
      const alreadyMerged = inHistory
      items.push({
        id: `merge-${branchName}`,
        label: alreadyMerged
          ? `Merge ${branchName} into ${branch} (already in ${branch})`
          : `Merge ${branchName} into ${branch}…`,
        disabled: gitBusy || workingTreeDirty || alreadyMerged,
        onClick: () => actions.mergeBranch(branchName)
      })
    }
  }

  items.push({
    id: 'branch',
    label: 'Create branch here…',
    disabled: gitBusy,
    onClick: () => actions.createBranch(commit.hash)
  })

  items.push({
    id: 'tag',
    label: 'Create tag here…',
    disabled: gitBusy,
    onClick: () => actions.createTag(commit.hash)
  })

  if (selectedCount === 1) {
    items.push({
      id: 'worktree',
      label: 'Checkout in new worktree…',
      disabled: gitBusy,
      onClick: () => actions.createWorktreeFromCommit(commit)
    })
  }

  items.push({ id: 'sep-history', label: '', separator: true, onClick: () => {} })

  const rewordBlocked =
    isMerge || workingTreeDirty || gitBusy || !inHistory || isDetached
  items.push({
    id: 'reword',
    label: inHistory
      ? `Reword commit on ${branchLabel}…`
      : 'Reword commit (not on current branch)…',
    disabled: rewordBlocked,
    onClick: () => actions.reword(commit)
  })

  const rebaseBlocked =
    isDetached || workingTreeDirty || gitBusy || isHead || !branch
  items.push({
    id: 'rebase',
    label: isHead
      ? 'Rebase current branch (already at this commit)'
      : `Rebase ${branchLabel} onto ${short}…`,
    disabled: rebaseBlocked,
    onClick: () => actions.rebaseOnto(commit.hash)
  })

  const cherryPickBlocked =
    workingTreeDirty || gitBusy || isHead || inHistory
  items.push({
    id: 'cherry-pick',
    label: inHistory
      ? `Cherry-pick ${short} (already in ${branchLabel})`
      : `Cherry-pick ${short} onto ${branchLabel}`,
    disabled: cherryPickBlocked,
    onClick: () => actions.cherryPick(commit.hash)
  })

  items.push({
    id: 'cherry-pick-no-commit',
    label: inHistory
      ? `Cherry-pick ${short} without commit (already in ${branchLabel})`
      : `Cherry-pick ${short} without commit onto ${branchLabel}`,
    disabled: cherryPickBlocked,
    onClick: () => actions.cherryPickNoCommit(commit.hash)
  })

  items.push({ id: 'sep-reset', label: '', separator: true, onClick: () => {} })

  if (isHead) {
    const deleteHardBlocked = gitBusy || workingTreeDirty
    const deleteSoftMixedBlocked = gitBusy
    items.push(
      {
        id: 'delete-soft',
        label: 'Delete this commit (soft)…',
        disabled: deleteSoftMixedBlocked,
        onClick: () => actions.deleteHead('soft')
      },
      {
        id: 'delete-mixed',
        label: 'Delete this commit (mixed)…',
        disabled: deleteSoftMixedBlocked,
        onClick: () => actions.deleteHead('mixed')
      },
      {
        id: 'delete-hard',
        label: 'Delete this commit (hard)…',
        disabled: deleteHardBlocked,
        danger: true,
        onClick: () => actions.deleteHead('hard')
      }
    )
  } else {
    const dropHardBlocked = isMerge || gitBusy || !inHistory || isHead
    if (inHistory) {
      items.push({
        id: 'drop',
        label: isMerge
          ? 'Drop commit (merge commits not supported)…'
          : 'Drop commit from history…',
        disabled: dropHardBlocked,
        danger: true,
        onClick: () => actions.dropCommits([commit])
      })
    }

    const revertBlocked = isMerge || gitBusy || !inHistory
    if (inHistory) {
      items.push({
        id: 'revert',
        label:
          (working?.ahead ?? 0) > 0
            ? `Revert commit (recommended for shared branches)…`
            : `Revert commit…`,
        disabled: revertBlocked,
        onClick: () => actions.revertCommit(commit)
      })
    } else {
      items.push({
        id: 'remove-stale',
        label: 'Remove stale branch history…',
        disabled: gitBusy,
        danger: true,
        onClick: () => actions.removeStaleHistory(commit)
      })
    }
  }

  if (!isHead) {
    const resetBlocked = gitBusy
    const resetTarget = behindHead
      ? `move ${branchLabel} back to ${short}`
      : aheadOfHead
        ? `move ${branchLabel} forward to ${short}`
        : `reset ${branchLabel} to ${short}`

    items.push({ id: 'sep-reset-to', label: '', separator: true, onClick: () => {} })

    items.push(
      {
        id: 'reset-soft',
        label: `Reset soft — ${resetTarget}`,
        disabled: resetBlocked || workingTreeDirty,
        onClick: () => actions.reset('soft', commit.hash)
      },
      {
        id: 'reset-mixed',
        label: `Reset mixed — ${resetTarget}`,
        disabled: resetBlocked || workingTreeDirty,
        onClick: () => actions.reset('mixed', commit.hash)
      },
      {
        id: 'reset-hard',
        label: `Reset hard — ${resetTarget}`,
        disabled: resetBlocked || workingTreeDirty,
        danger: true,
        onClick: () => actions.reset('hard', commit.hash)
      }
    )
  }

  return items
}
