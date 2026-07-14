import type { TFunction } from 'i18next'
import type { BranchCheckoutParams } from '@shared/git'
import type { ContextMenuItem } from '@/components/Ui/ContextMenu'
import type { GitBranch, GitTag, GitWorktreeEntry } from '@/lib/types'
import type { BitbucketIssue, BitbucketMergeMethod, BitbucketPullRequest } from '@shared/bitbucket'
import type { GitHubIssue, GitHubMergeMethod, GitHubPullRequest } from '@shared/github'
import type { GitlabIssue, GitlabMergeMethod, GitlabMergeRequest } from '@shared/gitlab'
import type { ForgeProvider } from '@/lib/forge/detect'
import { copyToClipboard } from '@/lib/clipboard'
import { detachedRefCheckoutParams, localBranchCheckoutParams } from '@/lib/git/branchCheckout'
import { remoteBranchShortName } from '@/lib/workspace/branchTree'
import { localTagName, tagCheckoutRef } from '@/lib/format/tagNames'
import { menuLabel, separator, toggleLabel } from '@/lib/context-menus/builders'

export function folderContextMenuItems(
  name: string,
  open: boolean,
  onToggle: () => void,
  t?: TFunction
): ContextMenuItem[] {
  return [
    {
      id: 'toggle',
      label: toggleLabel(t, open),
      onClick: onToggle
    },
    {
      id: 'copy',
      label: menuLabel(t, 'contextMenu.sidebar.copyName', 'Copy name'),
      onClick: () => void copyToClipboard(name)
    }
  ]
}

export function localBranchContextMenuItems(
  branch: GitBranch,
  handlers: {
    onCheckout: (params: BranchCheckoutParams) => void
    onSelectCommit: (hash: string) => void
    onMerge: (name: string) => void
    onMergeCurrentInto?: (name: string) => void
    currentBranch?: string
    onSquashMergeInto?: (name: string) => void
    onRename: (name: string) => void
    onDelete: (name: string) => void
    onSetUpstream?: (name: string) => void
    onUnsetUpstream?: (name: string) => void
    onCreatePr?: (name: string) => void
    onCheckoutInWorktree?: (name: string) => void
    onToggleGraphVisibility?: (name: string) => void
    isHiddenInGraph?: boolean
  },
  t?: TFunction
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: 'checkout',
      label: t ? t('common.checkout') : 'Checkout',
      disabled: branch.isCurrent,
      onClick: () => handlers.onCheckout(localBranchCheckoutParams(branch.name))
    },
    ...(handlers.onCheckoutInWorktree
      ? [
          {
            id: 'checkout-worktree',
            label: t ? t('contextMenu.checkoutNewWorktree') : 'Checkout in new worktree…',
            onClick: () => handlers.onCheckoutInWorktree!(branch.name)
          } as ContextMenuItem
        ]
      : []),
    {
      id: 'focus',
      label: t ? t('contextMenu.sidebar.focusCommit') : 'Focus commit',
      onClick: () => handlers.onSelectCommit(branch.head)
    },
    ...(handlers.onToggleGraphVisibility
      ? [
          {
            id: 'toggle-graph-visibility',
            label: handlers.isHiddenInGraph
              ? t
                ? t('contextMenu.sidebar.showInGraph')
                : 'Show in graph'
              : t
                ? t('contextMenu.sidebar.hideFromGraph')
                : 'Hide from graph',
            checked: !handlers.isHiddenInGraph,
            disabled: branch.isCurrent,
            onClick: () => handlers.onToggleGraphVisibility!(branch.name)
          } as ContextMenuItem
        ]
      : []),
    {
      id: 'copy',
      label: t ? t('contextMenu.sidebar.copyBranchName') : 'Copy branch name',
      onClick: () => void copyToClipboard(branch.name)
    }
  ]

  if (!branch.isCurrent) {
    items.push(separator('sep-actions'))
    const currentBranch = handlers.currentBranch
    items.push({
      id: 'merge',
      label: currentBranch
        ? t
          ? t('contextMenu.sidebar.mergeBranchIntoBranch', {
              source: branch.name,
              target: currentBranch
            })
          : `Merge ${branch.name} into ${currentBranch}…`
        : t
          ? t('contextMenu.sidebar.mergeIntoCurrent')
          : 'Merge into current…',
      onClick: () => handlers.onMerge(branch.name)
    })
    if (handlers.onMergeCurrentInto && currentBranch) {
      items.push({
        id: 'merge-current-into',
        label: t
          ? t('contextMenu.sidebar.mergeBranchIntoBranch', {
              source: currentBranch,
              target: branch.name
            })
          : `Merge ${currentBranch} into ${branch.name}…`,
        onClick: () => handlers.onMergeCurrentInto!(branch.name)
      })
    }
    if (handlers.onCreatePr && branch.ahead > 0) {
      items.push({
        id: 'create-pr',
        label: t ? t('contextMenu.sidebar.createPullRequest') : 'Create pull request…',
        onClick: () => handlers.onCreatePr!(branch.name)
      })
    }
    items.push({
      id: 'rename',
      label: t ? t('contextMenu.sidebar.rename') : 'Rename…',
      onClick: () => handlers.onRename(branch.name)
    })
    items.push(separator('sep-delete'))
    items.push({
      id: 'delete',
      label: t ? t('contextMenu.sidebar.deleteBranch') : 'Delete branch…',
      danger: true,
      onClick: () => handlers.onDelete(branch.name)
    })
  } else {
    items.push(separator('sep-actions'))
    if (handlers.onSquashMergeInto) {
      items.push({
        id: 'squash-merge-into',
        label: t ? t('contextMenu.sidebar.squashMergeInto') : 'Squash and merge into…',
        onClick: () => handlers.onSquashMergeInto!(branch.name)
      })
    }
    items.push(separator('sep-rename'))
    items.push({
      id: 'rename',
      label: t ? t('contextMenu.sidebar.rename') : 'Rename…',
      onClick: () => handlers.onRename(branch.name)
    })
  }

  if (handlers.onSetUpstream || handlers.onUnsetUpstream) {
    items.push(separator('sep-upstream'))
    if (branch.upstream && handlers.onUnsetUpstream) {
      items.push({
        id: 'unset-upstream',
        label: t ? t('contextMenu.sidebar.unsetUpstream') : 'Unset upstream',
        onClick: () => handlers.onUnsetUpstream!(branch.name)
      })
    }
    if (handlers.onSetUpstream) {
      items.push({
        id: 'set-upstream',
        label: branch.upstream
          ? t
            ? t('contextMenu.sidebar.changeUpstream')
            : 'Change upstream…'
          : t
            ? t('contextMenu.sidebar.setUpstream')
            : 'Set upstream…',
        onClick: () => handlers.onSetUpstream!(branch.name)
      })
    }
  }

  return items
}

export function worktreeContextMenuItems(
  entry: GitWorktreeEntry,
  handlers: {
    onOpenInTab: (path: string) => void
    onRemove: (entry: GitWorktreeEntry) => void
    onCopyPath: (path: string) => void
  },
  t?: TFunction
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: 'open-tab',
      label: t ? t('contextMenu.sidebar.openInTab') : 'Open in tab',
      onClick: () => handlers.onOpenInTab(entry.path)
    },
    {
      id: 'copy-path',
      label: t ? t('contextMenu.sidebar.copyPath') : 'Copy path',
      onClick: () => void copyToClipboard(entry.path)
    }
  ]

  if (!entry.isMain) {
    items.push(separator('sep-remove'))
    items.push({
      id: 'remove',
      label: t ? t('contextMenu.sidebar.removeWorktree') : 'Remove worktree…',
      danger: true,
      disabled: Boolean(entry.locked),
      onClick: () => handlers.onRemove(entry)
    })
  }

  return items
}

export function remoteFolderContextMenuItems(
  remote: string,
  open: boolean,
  handlers: {
    onToggle: () => void
    onFetch: (remote: string) => void
    onEditUrl?: (remote: string) => void
    onRename?: (remote: string) => void
    onDelete?: (remote: string) => void
  },
  t?: TFunction
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: 'toggle',
      label: toggleLabel(t, open),
      onClick: handlers.onToggle
    },
    {
      id: 'fetch',
      label: t ? t('contextMenu.sidebar.fetchFromRemote') : 'Fetch from remote',
      onClick: () => handlers.onFetch(remote)
    }
  ]

  if (handlers.onEditUrl) {
    items.push({
      id: 'edit-url',
      label: t ? t('contextMenu.sidebar.editUrl') : 'Edit URL…',
      onClick: () => handlers.onEditUrl!(remote)
    })
  }

  if (handlers.onRename) {
    items.push({
      id: 'rename-remote',
      label: t ? t('contextMenu.sidebar.rename') : 'Rename…',
      onClick: () => handlers.onRename!(remote)
    })
  }

  items.push({
    id: 'copy',
    label: t ? t('contextMenu.sidebar.copyRemoteName') : 'Copy remote name',
    onClick: () => void copyToClipboard(remote)
  })

  if (handlers.onDelete) {
    items.push(separator('sep-delete-remote'))
    items.push({
      id: 'delete-remote',
      label: t ? t('contextMenu.sidebar.deleteRemote') : 'Delete remote…',
      danger: true,
      onClick: () => handlers.onDelete!(remote)
    })
  }

  return items
}

export function remoteBranchContextMenuItems(
  branch: GitBranch,
  handlers: {
    onSelectCommit: (hash: string) => void
    onCheckout?: (remoteBranch: string) => void
    onDeleteRemote?: (remoteBranch: string) => void
    onToggleGraphVisibility?: (remoteBranch: string) => void
    isHiddenInGraph?: boolean
  },
  t?: TFunction
): ContextMenuItem[] {
  const shortName = remoteBranchShortName(branch.name)
  const items: ContextMenuItem[] = [
    {
      id: 'checkout',
      label: t ? t('contextMenu.sidebar.checkoutAsLocal') : 'Checkout as local branch…',
      onClick: () => handlers.onCheckout?.(branch.name)
    },
    {
      id: 'focus',
      label: t ? t('contextMenu.sidebar.focusCommit') : 'Focus commit',
      onClick: () => handlers.onSelectCommit(branch.head)
    },
    ...(handlers.onToggleGraphVisibility
      ? [
          {
            id: 'toggle-graph-visibility',
            label: handlers.isHiddenInGraph
              ? t
                ? t('contextMenu.sidebar.showInGraph')
                : 'Show in graph'
              : t
                ? t('contextMenu.sidebar.hideFromGraph')
                : 'Hide from graph',
            checked: !handlers.isHiddenInGraph,
            onClick: () => handlers.onToggleGraphVisibility!(branch.name)
          } as ContextMenuItem
        ]
      : []),
    {
      id: 'copy-short',
      label: t ? t('contextMenu.sidebar.copyBranchName') : 'Copy branch name',
      onClick: () => void copyToClipboard(shortName)
    },
    {
      id: 'copy-full',
      label: t ? t('contextMenu.sidebar.copyRemoteRef') : 'Copy remote ref',
      onClick: () => void copyToClipboard(branch.name.replace(/^remotes\//, ''))
    }
  ]

  if (handlers.onDeleteRemote) {
    items.push(separator('sep-delete-remote'))
    items.push({
      id: 'delete-remote',
      label: t ? t('contextMenu.sidebar.deleteRemoteBranch') : 'Delete remote branch…',
      danger: true,
      onClick: () => handlers.onDeleteRemote!(branch.name)
    })
  }

  return items
}

export function stashContextMenuItems(
  index: number,
  hash: string,
  message: string,
  handlers: {
    onSelect: (index: number, hash: string) => void
    onApply: (index: number) => void
    onPop: (index: number) => void
    onDrop: (index: number) => void
    onBranch?: (index: number) => void
  },
  t?: TFunction
): ContextMenuItem[] {
  const ref = `stash@{${index}}`
  return [
    {
      id: 'view',
      label: t ? t('contextMenu.sidebar.view') : 'View',
      onClick: () => handlers.onSelect(index, hash)
    },
    separator('sep-ops'),
    {
      id: 'apply',
      label: t ? t('contextMenu.sidebar.apply') : 'Apply',
      onClick: () => handlers.onApply(index)
    },
    {
      id: 'pop',
      label: t ? t('contextMenu.sidebar.pop') : 'Pop',
      onClick: () => handlers.onPop(index)
    },
    ...(handlers.onBranch
      ? [
          {
            id: 'branch',
            label: t ? t('modals.stashBranch.title') : 'Create branch from stash',
            onClick: () => handlers.onBranch!(index)
          } as ContextMenuItem
        ]
      : []),
    separator('sep-drop'),
    {
      id: 'drop',
      label: t ? t('contextMenu.sidebar.drop') : 'Drop',
      danger: true,
      onClick: () => handlers.onDrop(index)
    },
    {
      id: 'copy-ref',
      label: t ? t('contextMenu.sidebar.copyReference') : 'Copy reference',
      onClick: () => void copyToClipboard(ref)
    },
    {
      id: 'copy-message',
      label: t ? t('contextMenu.sidebar.copyMessage') : 'Copy message',
      onClick: () => void copyToClipboard(message || ref)
    }
  ]
}

export function tagContextMenuItems(
  tag: GitTag,
  handlers: {
    defaultRemote?: string
    onSelectCommit: (hash: string) => void
    onCheckout: (params: BranchCheckoutParams) => void
    onPush: (name: string, remote?: string) => void
    onRename?: (tag: GitTag) => void
    onDelete: (tag: GitTag, remote?: string) => void
  },
  t?: TFunction
): ContextMenuItem[] {
  const shortName = localTagName(tag.name)
  const items: ContextMenuItem[] = [
    {
      id: 'focus',
      label: t ? t('contextMenu.sidebar.focusCommit') : 'Focus commit',
      onClick: () => handlers.onSelectCommit(tag.target)
    }
  ]

  if (!tag.isRemote) {
    items.push({
      id: 'checkout',
      label: t
        ? t('contextMenu.sidebar.checkoutTag', { name: shortName })
        : `Checkout ${shortName}`,
      onClick: () => handlers.onCheckout(detachedRefCheckoutParams(tagCheckoutRef(tag.name)))
    })
    items.push(separator('sep-push'))
    items.push({
      id: 'push',
      label: handlers.defaultRemote
        ? t
          ? t('contextMenu.sidebar.pushToRemote', { remote: handlers.defaultRemote })
          : `Push to ${handlers.defaultRemote}`
        : t
          ? t('contextMenu.sidebar.pushToRemoteDefault')
          : 'Push to remote',
      disabled: !handlers.defaultRemote,
      onClick: () => handlers.onPush(shortName, handlers.defaultRemote)
    })
    if (handlers.onRename) {
      items.push({
        id: 'rename',
        label: t ? t('contextMenu.sidebar.rename') : 'Rename…',
        onClick: () => handlers.onRename!(tag)
      })
    }
    items.push(separator('sep-delete'))
    items.push({
      id: 'delete',
      label: t ? t('contextMenu.sidebar.deleteTag') : 'Delete tag…',
      danger: true,
      onClick: () => handlers.onDelete(tag)
    })
  } else if (tag.remote) {
    items.push(separator('sep-delete'))
    items.push({
      id: 'delete-remote',
      label: t
        ? t('contextMenu.sidebar.deleteFromRemote', { remote: tag.remote })
        : `Delete from ${tag.remote}…`,
      danger: true,
      onClick: () => handlers.onDelete(tag, tag.remote)
    })
  }

  items.push(separator('sep-copy'))
  items.push({
    id: 'copy-name',
    label: t ? t('contextMenu.sidebar.copyTagName') : 'Copy tag name',
    onClick: () => void copyToClipboard(shortName)
  })
  items.push({
    id: 'copy-hash',
    label: t ? t('contextMenu.copyCommitHash') : 'Copy commit hash',
    onClick: () => void copyToClipboard(tag.target)
  })

  return items
}

function forgeOpenLabel(provider: ForgeProvider, t?: TFunction): string {
  if (provider === 'bitbucket') {
    return t ? t('contextMenu.sidebar.openOnBitbucket') : 'Open on Bitbucket'
  }
  if (provider === 'gitlab') {
    return t ? t('contextMenu.sidebar.openOnGitlab') : 'Open on GitLab'
  }
  return t ? t('contextMenu.sidebar.openOnGitHub') : 'Open on GitHub'
}

export function pullRequestContextMenuItems(
  pr: GitHubPullRequest | BitbucketPullRequest | GitlabMergeRequest,
  handlers: {
    onMerge: (method: GitHubMergeMethod | BitbucketMergeMethod | GitlabMergeMethod) => void
  },
  t?: TFunction,
  provider: ForgeProvider = 'github'
): ContextMenuItem[] {
  const openLabel = forgeOpenLabel(provider, t)
  return [
    {
      id: 'open',
      label: openLabel,
      onClick: () => window.open(pr.htmlUrl, '_blank', 'noopener,noreferrer')
    },
    {
      id: 'copy',
      label: t ? t('contextMenu.sidebar.copyLink') : 'Copy link',
      onClick: () => void copyToClipboard(pr.htmlUrl)
    },
    separator('sep-merge'),
    {
      id: 'merge',
      label: t ? t('contextMenu.sidebar.mergeCommit') : 'Merge commit',
      onClick: () => handlers.onMerge('merge')
    },
    {
      id: 'squash',
      label: t ? t('contextMenu.sidebar.squashAndMerge') : 'Squash and merge',
      onClick: () => handlers.onMerge('squash')
    },
    {
      id: 'rebase',
      label: t ? t('contextMenu.sidebar.rebaseAndMerge') : 'Rebase and merge',
      onClick: () => handlers.onMerge('rebase')
    }
  ]
}

export function issueContextMenuItems(
  issue: GitHubIssue | BitbucketIssue | GitlabIssue,
  handlers: {
    onBranchFromIssue: (issueNumber: number, title: string) => void
    onEdit?: (issue: GitHubIssue | BitbucketIssue | GitlabIssue) => void
    onClose?: (issue: GitHubIssue | BitbucketIssue | GitlabIssue) => void
    onReopen?: (issue: GitHubIssue | BitbucketIssue | GitlabIssue) => void
  },
  t?: TFunction,
  provider: ForgeProvider = 'github'
): ContextMenuItem[] {
  const openLabel = forgeOpenLabel(provider, t)
  const issueNs =
    provider === 'bitbucket'
      ? 'bitbucket.issue'
      : provider === 'gitlab'
        ? 'gitlab.issue'
        : 'github.issue'
  const items: ContextMenuItem[] = [
    {
      id: 'open',
      label: openLabel,
      onClick: () => window.open(issue.htmlUrl, '_blank', 'noopener,noreferrer')
    },
    {
      id: 'copy',
      label: t ? t('contextMenu.sidebar.copyLink') : 'Copy link',
      onClick: () => void copyToClipboard(issue.htmlUrl)
    }
  ]

  if (handlers.onEdit) {
    items.push({
      id: 'edit',
      label: t ? t(`${issueNs}.edit`) : 'Edit issue…',
      onClick: () => handlers.onEdit!(issue)
    })
  }

  if (issue.state === 'open' && handlers.onClose) {
    items.push({
      id: 'close',
      label: t ? t(`${issueNs}.close`) : 'Close issue',
      onClick: () => handlers.onClose!(issue)
    })
  }

  if (issue.state === 'closed' && handlers.onReopen) {
    items.push({
      id: 'reopen',
      label: t ? t(`${issueNs}.reopen`) : 'Reopen issue',
      onClick: () => handlers.onReopen!(issue)
    })
  }

  items.push(separator('sep-branch'))
  items.push({
    id: 'branch',
    label: t ? t('contextMenu.sidebar.branchFromIssue') : 'Branch from issue',
    onClick: () => handlers.onBranchFromIssue(issue.number, issue.title)
  })

  return items
}
