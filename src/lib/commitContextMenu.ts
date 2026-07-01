import type { ContextMenuItem } from '@/components/ui/ContextMenu'
import {
  isAheadOfHead,
  isBehindHead,
  isOnCurrentBranchHistory
} from '@/lib/commitReachability'
import { timelineRefs } from '@/lib/timelineRefs'
import type { GitCommit, GitWorkingStatus } from '@/lib/types'

export interface CommitContextMenuActions {
  selectCommit: (hash: string) => void
  copyHash: (hash: string) => void
  copyShortHash: (shortHash: string) => void
  checkout: (ref: string) => void
  createBranch: (hash: string) => void
  reword: (commit: GitCommit) => void
  rebaseOnto: (hash: string) => void
  cherryPick: (hash: string) => void
  reset: (mode: 'soft' | 'mixed' | 'hard', hash: string) => void
  rebaseContinue: () => void
  rebaseAbort: () => void
  mergeContinue: () => void
  mergeAbort: () => void
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
  actions: CommitContextMenuActions
}

function localBranchRefs(commit: GitCommit): string[] {
  return timelineRefs(commit.refs).filter((ref) => !ref.includes('/'))
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
  actions
}: CommitContextMenuContext): ContextMenuItem[] {
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

  const branchLabel = isDetached ? 'detached HEAD' : branch || 'current branch'

  if (working?.rebaseInProgress) {
    items.push(
      { id: 'rebase-continue', label: 'Continue rebase', onClick: actions.rebaseContinue },
      { id: 'rebase-abort', label: 'Abort rebase', danger: true, onClick: actions.rebaseAbort },
      { id: 'sep-rebase', label: '', separator: true, onClick: () => {} }
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

  items.push({
    id: 'branch',
    label: 'Create branch here…',
    disabled: gitBusy,
    onClick: () => actions.createBranch(commit.hash)
  })

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

  items.push({ id: 'sep-reset', label: '', separator: true, onClick: () => {} })

  const resetBlocked = gitBusy || isHead
  const resetTarget = behindHead
    ? `move ${branchLabel} back to ${short}`
    : aheadOfHead
      ? `move ${branchLabel} forward to ${short}`
      : `reset ${branchLabel} to ${short}`

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

  return items
}
