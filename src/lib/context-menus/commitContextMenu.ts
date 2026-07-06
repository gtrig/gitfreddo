import type { TFunction } from 'i18next'
import type { ResetMode } from '@/components/DetailPanel/DeleteCommitModal'
import type { ContextMenuItem } from '@/components/Ui/ContextMenu'
import {
  isAheadOfHead,
  isBehindHead,
  isOnCurrentBranchHistory
} from '@/lib/git/commitReachability'
import { selectedCommitsInTimeline } from '@/lib/git/commitSelection'
import { buildMultiCommitContextMenuItems, type MultiCommitContextMenuActions } from '@/lib/context-menus/multiCommitContextMenu'
import { isStashCommit } from '@/lib/git/stashCommit'
import { timelineRefs } from '@/lib/timeline/timelineRefs'
import type { GitCommit, GitWorkingStatus } from '@/lib/types'

export interface CommitContextMenuActions extends MultiCommitContextMenuActions {
  selectCommit: (hash: string) => void
  copyHash: (hash: string) => void
  copyShortHash: (shortHash: string) => void
  explainCommits: (commits: GitCommit[]) => void
  checkout: (ref: string) => void
  mergeBranch: (branchName: string) => void
  createWorktreeFromCommit: (commit: GitCommit) => void
  createBranch: (hash: string) => void
  createTag: (hash: string) => void
  addNote: (commit: GitCommit) => void
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
  aiEnabled?: boolean
  t?: TFunction
}

function localBranchRefs(commit: GitCommit): string[] {
  return timelineRefs(commit.refs)
    .filter((ref) => ref.kind === 'branch')
    .map((ref) => ref.label)
}

function branchLabelText(t: TFunction | undefined, isDetached: boolean, branch: string): string {
  if (isDetached) {
    return t ? t('contextMenu.detachedHead') : 'detached HEAD'
  }
  return branch || (t ? t('contextMenu.currentBranch') : 'current branch')
}

function resetTargetLabel(
  t: TFunction | undefined,
  branchLabel: string,
  short: string,
  behindHead: boolean,
  aheadOfHead: boolean
): string {
  if (behindHead) {
    return t
      ? t('contextMenu.moveBack', { branch: branchLabel, short })
      : `move ${branchLabel} back to ${short}`
  }
  if (aheadOfHead) {
    return t
      ? t('contextMenu.moveForward', { branch: branchLabel, short })
      : `move ${branchLabel} forward to ${short}`
  }
  return t
    ? t('contextMenu.resetTo', { branch: branchLabel, short })
    : `reset ${branchLabel} to ${short}`
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
  actions,
  aiEnabled = false,
  t
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

  const branchLabel = branchLabelText(t, isDetached, branch)

  if (working?.rebaseInProgress) {
    items.push(
      {
        id: 'rebase-continue',
        label: t ? t('contextMenu.continueRebase') : 'Continue rebase',
        onClick: actions.rebaseContinue
      },
      {
        id: 'rebase-skip',
        label: t ? t('contextMenu.skipCommit') : 'Skip commit',
        onClick: actions.rebaseSkip
      },
      {
        id: 'rebase-abort',
        label: t ? t('contextMenu.abortRebase') : 'Abort rebase',
        danger: true,
        onClick: actions.rebaseAbort
      },
      { id: 'sep-rebase', label: '', separator: true, onClick: () => {} }
    )
  }

  if (working?.cherryPickInProgress) {
    items.push(
      {
        id: 'cherry-pick-continue',
        label: t ? t('contextMenu.continueCherryPick') : 'Continue cherry-pick',
        onClick: actions.cherryPickContinue
      },
      {
        id: 'cherry-pick-skip',
        label: t ? t('contextMenu.skipCommit') : 'Skip commit',
        onClick: actions.cherryPickSkip
      },
      {
        id: 'cherry-pick-abort',
        label: t ? t('contextMenu.abortCherryPick') : 'Abort cherry-pick',
        danger: true,
        onClick: actions.cherryPickAbort
      },
      { id: 'sep-cherry-pick', label: '', separator: true, onClick: () => {} }
    )
  }

  if (working?.mergeInProgress) {
    items.push(
      {
        id: 'merge-continue',
        label: t ? t('contextMenu.continueMerge') : 'Continue merge',
        onClick: actions.mergeContinue
      },
      {
        id: 'merge-abort',
        label: t ? t('contextMenu.abortMerge') : 'Abort merge',
        danger: true,
        onClick: actions.mergeAbort
      },
      { id: 'sep-merge', label: '', separator: true, onClick: () => {} }
    )
  }

  items.push({
    id: 'view',
    label:
      selectedCount > 1
        ? t
          ? t('contextMenu.viewCommitMulti', { count: selectedCount })
          : `View commit (${selectedCount} selected)`
        : selectedCommitId === commit.hash
          ? t
            ? t('contextMenu.viewCommitSelected')
            : 'View commit (selected)'
          : t
            ? t('contextMenu.viewCommit')
            : 'View commit',
    onClick: () => actions.selectCommit(commit.hash)
  })

  items.push(
    {
      id: 'copy-hash',
      label: t ? t('contextMenu.copyCommitHash') : 'Copy commit hash',
      onClick: () => actions.copyHash(commit.hash)
    },
    {
      id: 'copy-short',
      label: t ? t('contextMenu.copyShortHash') : 'Copy short hash',
      onClick: () => actions.copyShortHash(commit.shortHash)
    },
    { id: 'sep-copy', label: '', separator: true, onClick: () => {} }
  )

  if (aiEnabled && selectedCount <= 1) {
    items.push({
      id: 'explain-commit',
      label: t ? t('contextMenu.explainCommitWithAi') : 'Explain…',
      onClick: () => actions.explainCommits([commit])
    })
  }

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
        actions,
        aiEnabled,
        t
      })
    )
  }

  if (isHead) {
    items.push({
      id: 'checkout',
      label:
        branch && !isDetached
          ? t
            ? t('contextMenu.checkedOutAtHeadBranch', { branch })
            : `Checked out at HEAD (${branch})`
          : t
            ? t('contextMenu.checkedOutAtHead')
            : 'Checked out at HEAD',
      disabled: true,
      onClick: () => {}
    })
  } else if (checkoutBranches.length > 0) {
    for (const branchName of checkoutBranches) {
      items.push({
        id: `checkout-${branchName}`,
        label: t ? t('contextMenu.checkoutBranch', { branch: branchName }) : `Checkout ${branchName}`,
        disabled: gitBusy,
        onClick: () => actions.checkout(branchName)
      })
    }
  } else {
    items.push({
      id: 'checkout',
      label: t ? t('contextMenu.checkoutCommitDetached') : 'Checkout commit (detached HEAD)',
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
          ? t
            ? t('contextMenu.mergeIntoAlready', {
                source: branchName,
                target: branch,
                branch
              })
            : `Merge ${branchName} into ${branch} (already in ${branch})`
          : t
            ? t('contextMenu.mergeInto', { source: branchName, target: branch })
            : `Merge ${branchName} into ${branch}…`,
        disabled: gitBusy || workingTreeDirty || alreadyMerged,
        onClick: () => actions.mergeBranch(branchName)
      })
    }
  }

  items.push({
    id: 'branch',
    label: t ? t('contextMenu.createBranchHere') : 'Create branch here…',
    disabled: gitBusy,
    onClick: () => actions.createBranch(commit.hash)
  })

  items.push({
    id: 'tag',
    label: t ? t('contextMenu.createTagHere') : 'Create tag here…',
    disabled: gitBusy,
    onClick: () => actions.createTag(commit.hash)
  })

  items.push({
    id: 'note',
    label: commit.notes.trim()
      ? t
        ? t('contextMenu.editNote')
        : 'Edit note…'
      : t
        ? t('contextMenu.addNote')
        : 'Add note…',
    disabled: gitBusy,
    onClick: () => actions.addNote(commit)
  })

  if (selectedCount === 1) {
    items.push({
      id: 'worktree',
      label: t ? t('contextMenu.checkoutNewWorktree') : 'Checkout in new worktree…',
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
      ? t
        ? t('contextMenu.rewordOnBranch', { branch: branchLabel })
        : `Reword commit on ${branchLabel}…`
      : t
        ? t('contextMenu.rewordNotOnBranch')
        : 'Reword commit (not on current branch)…',
    disabled: rewordBlocked,
    onClick: () => actions.reword(commit)
  })

  const rebaseBlocked =
    isDetached || workingTreeDirty || gitBusy || isHead || !branch
  items.push({
    id: 'rebase',
    label: isHead
      ? t
        ? t('contextMenu.rebaseAtHead')
        : 'Rebase current branch (already at this commit)'
      : t
        ? t('contextMenu.rebaseOnto', { branch: branchLabel, short })
        : `Rebase ${branchLabel} onto ${short}…`,
    disabled: rebaseBlocked,
    onClick: () => actions.rebaseOnto(commit.hash)
  })

  const cherryPickBlocked =
    workingTreeDirty || gitBusy || isHead || inHistory
  items.push({
    id: 'cherry-pick',
    label: inHistory
      ? t
        ? t('contextMenu.cherryPickAlready', { short, branch: branchLabel })
        : `Cherry-pick ${short} (already in ${branchLabel})`
      : t
        ? t('contextMenu.cherryPickOnto', { short, branch: branchLabel })
        : `Cherry-pick ${short} onto ${branchLabel}`,
    disabled: cherryPickBlocked,
    onClick: () => actions.cherryPick(commit.hash)
  })

  items.push({
    id: 'cherry-pick-no-commit',
    label: inHistory
      ? t
        ? t('contextMenu.cherryPickNoCommitAlready', { short, branch: branchLabel })
        : `Cherry-pick ${short} without commit (already in ${branchLabel})`
      : t
        ? t('contextMenu.cherryPickNoCommitOnto', { short, branch: branchLabel })
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
        label: t ? t('contextMenu.deleteCommitSoft') : 'Delete this commit (soft)…',
        disabled: deleteSoftMixedBlocked,
        onClick: () => actions.deleteHead('soft')
      },
      {
        id: 'delete-mixed',
        label: t ? t('contextMenu.deleteCommitMixed') : 'Delete this commit (mixed)…',
        disabled: deleteSoftMixedBlocked,
        onClick: () => actions.deleteHead('mixed')
      },
      {
        id: 'delete-hard',
        label: t ? t('contextMenu.deleteCommitHard') : 'Delete this commit (hard)…',
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
          ? t
            ? t('contextMenu.dropCommitMergeNotSupported')
            : 'Drop commit (merge commits not supported)…'
          : t
            ? t('contextMenu.dropCommitFromHistory')
            : 'Drop commit from history…',
        disabled: dropHardBlocked,
        danger: true,
        onClick: () => actions.dropCommits([commit])
      })
    }

    const revertBlocked = gitBusy || !inHistory
    if (inHistory) {
      items.push({
        id: 'revert',
        label:
          (working?.ahead ?? 0) > 0
            ? t
              ? t('contextMenu.revertCommitRecommended')
              : 'Revert commit (recommended for shared branches)…'
            : t
              ? t('contextMenu.revertCommit')
              : 'Revert commit…',
        disabled: revertBlocked,
        onClick: () => actions.revertCommit(commit)
      })
    } else {
      items.push({
        id: 'remove-stale',
        label: t ? t('contextMenu.removeStaleBranchHistory') : 'Remove stale branch history…',
        disabled: gitBusy,
        danger: true,
        onClick: () => actions.removeStaleHistory(commit)
      })
    }
  }

  if (!isHead) {
    const resetBlocked = gitBusy
    const resetTarget = resetTargetLabel(t, branchLabel, short, behindHead, aheadOfHead)

    items.push({ id: 'sep-reset-to', label: '', separator: true, onClick: () => {} })

    items.push(
      {
        id: 'reset-soft',
        label: t
          ? t('contextMenu.resetSoft', { target: resetTarget })
          : `Reset soft — ${resetTarget}`,
        disabled: resetBlocked || workingTreeDirty,
        onClick: () => actions.reset('soft', commit.hash)
      },
      {
        id: 'reset-mixed',
        label: t
          ? t('contextMenu.resetMixed', { target: resetTarget })
          : `Reset mixed — ${resetTarget}`,
        disabled: resetBlocked || workingTreeDirty,
        onClick: () => actions.reset('mixed', commit.hash)
      },
      {
        id: 'reset-hard',
        label: t
          ? t('contextMenu.resetHard', { target: resetTarget })
          : `Reset hard — ${resetTarget}`,
        disabled: resetBlocked || workingTreeDirty,
        danger: true,
        onClick: () => actions.reset('hard', commit.hash)
      }
    )
  }

  return items
}
