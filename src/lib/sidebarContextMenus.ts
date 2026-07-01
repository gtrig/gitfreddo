import type { ContextMenuItem } from '@/components/ui/ContextMenu'
import type { GitBranch, GitTag } from '@/lib/types'
import type { GitHubIssue, GitHubMergeMethod, GitHubPullRequest } from '../../shared/github'
import { copyToClipboard } from '@/lib/clipboard'
import { remoteBranchShortName } from '@/lib/branchTree'
import { localTagName, tagCheckoutRef } from '@/lib/tagNames'

function separator(id: string): ContextMenuItem {
  return { id, label: '', separator: true, onClick: () => {} }
}

export function folderContextMenuItems(
  name: string,
  open: boolean,
  onToggle: () => void
): ContextMenuItem[] {
  return [
    {
      id: 'toggle',
      label: open ? 'Collapse' : 'Expand',
      onClick: onToggle
    },
    {
      id: 'copy',
      label: 'Copy name',
      onClick: () => void copyToClipboard(name)
    }
  ]
}

export function localBranchContextMenuItems(
  branch: GitBranch,
  handlers: {
    onCheckout: (name: string) => void
    onSelectCommit: (hash: string) => void
    onMerge: (name: string) => void
    onDelete: (name: string) => void
    onCreatePr?: (name: string) => void
  }
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: 'checkout',
      label: 'Checkout',
      disabled: branch.isCurrent,
      onClick: () => handlers.onCheckout(branch.name)
    },
    {
      id: 'focus',
      label: 'Focus commit',
      onClick: () => handlers.onSelectCommit(branch.head)
    },
    {
      id: 'copy',
      label: 'Copy branch name',
      onClick: () => void copyToClipboard(branch.name)
    }
  ]

  if (!branch.isCurrent) {
    items.push(separator('sep-actions'))
    items.push({
      id: 'merge',
      label: 'Merge into current…',
      onClick: () => handlers.onMerge(branch.name)
    })
    if (handlers.onCreatePr && branch.ahead > 0) {
      items.push({
        id: 'create-pr',
        label: 'Create pull request…',
        onClick: () => handlers.onCreatePr!(branch.name)
      })
    }
    items.push(separator('sep-delete'))
    items.push({
      id: 'delete',
      label: 'Delete branch…',
      danger: true,
      onClick: () => handlers.onDelete(branch.name)
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
  }
): ContextMenuItem[] {
  return [
    {
      id: 'toggle',
      label: open ? 'Collapse' : 'Expand',
      onClick: handlers.onToggle
    },
    {
      id: 'fetch',
      label: 'Fetch from remote',
      onClick: () => handlers.onFetch(remote)
    },
    {
      id: 'copy',
      label: 'Copy remote name',
      onClick: () => void copyToClipboard(remote)
    }
  ]
}

export function remoteBranchContextMenuItems(
  branch: GitBranch,
  onSelectCommit: (hash: string) => void
): ContextMenuItem[] {
  const shortName = remoteBranchShortName(branch.name)
  return [
    {
      id: 'focus',
      label: 'Focus commit',
      onClick: () => onSelectCommit(branch.head)
    },
    {
      id: 'copy-short',
      label: 'Copy branch name',
      onClick: () => void copyToClipboard(shortName)
    },
    {
      id: 'copy-full',
      label: 'Copy remote ref',
      onClick: () => void copyToClipboard(branch.name.replace(/^remotes\//, ''))
    }
  ]
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
  }
): ContextMenuItem[] {
  const ref = `stash@{${index}}`
  return [
    {
      id: 'view',
      label: 'View',
      onClick: () => handlers.onSelect(index, hash)
    },
    separator('sep-ops'),
    {
      id: 'apply',
      label: 'Apply',
      onClick: () => handlers.onApply(index)
    },
    {
      id: 'pop',
      label: 'Pop',
      onClick: () => handlers.onPop(index)
    },
    separator('sep-drop'),
    {
      id: 'drop',
      label: 'Drop',
      danger: true,
      onClick: () => handlers.onDrop(index)
    },
    {
      id: 'copy-ref',
      label: 'Copy reference',
      onClick: () => void copyToClipboard(ref)
    },
    {
      id: 'copy-message',
      label: 'Copy message',
      onClick: () => void copyToClipboard(message || ref)
    }
  ]
}

export function tagContextMenuItems(
  tag: GitTag,
  handlers: {
    defaultRemote?: string
    onSelectCommit: (hash: string) => void
    onCheckout: (ref: string) => void
    onPush: (name: string, remote?: string) => void
    onDelete: (tag: GitTag, remote?: string) => void
  }
): ContextMenuItem[] {
  const shortName = localTagName(tag.name)
  const items: ContextMenuItem[] = [
    {
      id: 'focus',
      label: 'Focus commit',
      onClick: () => handlers.onSelectCommit(tag.target)
    }
  ]

  if (!tag.isRemote) {
    items.push({
      id: 'checkout',
      label: `Checkout ${shortName}`,
      onClick: () => handlers.onCheckout(tagCheckoutRef(tag.name))
    })
    items.push(separator('sep-push'))
    items.push({
      id: 'push',
      label: handlers.defaultRemote
        ? `Push to ${handlers.defaultRemote}`
        : 'Push to remote',
      disabled: !handlers.defaultRemote,
      onClick: () => handlers.onPush(shortName, handlers.defaultRemote)
    })
    items.push(separator('sep-delete'))
    items.push({
      id: 'delete',
      label: 'Delete tag…',
      danger: true,
      onClick: () => handlers.onDelete(tag)
    })
  } else if (tag.remote) {
    items.push(separator('sep-delete'))
    items.push({
      id: 'delete-remote',
      label: `Delete from ${tag.remote}…`,
      danger: true,
      onClick: () => handlers.onDelete(tag, tag.remote)
    })
  }

  items.push(separator('sep-copy'))
  items.push({
    id: 'copy-name',
    label: 'Copy tag name',
    onClick: () => void copyToClipboard(shortName)
  })
  items.push({
    id: 'copy-hash',
    label: 'Copy commit hash',
    onClick: () => void copyToClipboard(tag.target)
  })

  return items
}

export function pullRequestContextMenuItems(
  pr: GitHubPullRequest,
  handlers: {
    onMerge: (method: GitHubMergeMethod) => void
  }
): ContextMenuItem[] {
  return [
    {
      id: 'open',
      label: 'Open on GitHub',
      onClick: () => window.open(pr.htmlUrl, '_blank', 'noopener,noreferrer')
    },
    {
      id: 'copy',
      label: 'Copy link',
      onClick: () => void copyToClipboard(pr.htmlUrl)
    },
    separator('sep-merge'),
    {
      id: 'merge',
      label: 'Merge commit',
      onClick: () => handlers.onMerge('merge')
    },
    {
      id: 'squash',
      label: 'Squash and merge',
      onClick: () => handlers.onMerge('squash')
    },
    {
      id: 'rebase',
      label: 'Rebase and merge',
      onClick: () => handlers.onMerge('rebase')
    }
  ]
}

export function issueContextMenuItems(
  issue: GitHubIssue,
  onBranchFromIssue: (issueNumber: number, title: string) => void
): ContextMenuItem[] {
  return [
    {
      id: 'open',
      label: 'Open on GitHub',
      onClick: () => window.open(issue.htmlUrl, '_blank', 'noopener,noreferrer')
    },
    {
      id: 'copy',
      label: 'Copy link',
      onClick: () => void copyToClipboard(issue.htmlUrl)
    },
    separator('sep-branch'),
    {
      id: 'branch',
      label: 'Branch from issue',
      onClick: () => onBranchFromIssue(issue.number, issue.title)
    }
  ]
}
