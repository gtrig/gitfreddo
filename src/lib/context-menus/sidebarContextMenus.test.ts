import { describe, expect, it } from 'vitest'
import type { GitBranch, GitTag, GitWorktreeEntry } from '@/lib/types'
import {
  folderContextMenuItems,
  issueContextMenuItems,
  localBranchContextMenuItems,
  pullRequestContextMenuItems,
  remoteBranchContextMenuItems,
  remoteFolderContextMenuItems,
  stashContextMenuItems,
  tagContextMenuItems,
  worktreeContextMenuItems
} from './sidebarContextMenus'

const noop = () => {}

const branch = (overrides: Partial<GitBranch> = {}): GitBranch => ({
  name: 'feature/login',
  head: 'abc1234',
  ahead: 2,
  behind: 0,
  isCurrent: false,
  isRemote: false,
  ...overrides
})

describe('folderContextMenuItems', () => {
  it('shows collapse when open', () => {
    const items = folderContextMenuItems('origin', true, noop)
    expect(items[0]?.label).toBe('Collapse')
  })
})

describe('localBranchContextMenuItems', () => {
  it('disables checkout for the current branch', () => {
    const items = localBranchContextMenuItems(branch({ isCurrent: true }), {
      onCheckout: noop,
      onSelectCommit: noop,
      onMerge: noop,
      onRename: noop,
      onDelete: noop
    })

    expect(items.find((item) => item.id === 'checkout')?.disabled).toBe(true)
    expect(items.some((item) => item.id === 'delete')).toBe(false)
  })

  it('offers create PR when ahead and handler is provided', () => {
    const items = localBranchContextMenuItems(branch({ ahead: 3 }), {
      onCheckout: noop,
      onSelectCommit: noop,
      onMerge: noop,
      onRename: noop,
      onDelete: noop,
      onCreatePr: noop
    })

    expect(items.some((item) => item.id === 'create-pr')).toBe(true)
  })
})

describe('worktreeContextMenuItems', () => {
  const entry: GitWorktreeEntry = {
    path: '/tmp/wt',
    head: 'abc',
    branch: 'feature',
    isDetached: false,
    isMain: false,
    isBare: false
  }

  it('allows removing non-main worktrees', () => {
    const items = worktreeContextMenuItems(entry, {
      onOpenInTab: noop,
      onRemove: noop,
      onCopyPath: noop
    })
    expect(items.some((item) => item.id === 'remove')).toBe(true)
  })

  it('hides remove for the main worktree', () => {
    const items = worktreeContextMenuItems({ ...entry, isMain: true }, {
      onOpenInTab: noop,
      onRemove: noop,
      onCopyPath: noop
    })
    expect(items.some((item) => item.id === 'remove')).toBe(false)
  })
})

describe('remoteBranchContextMenuItems', () => {
  it('includes delete action when handler is provided', () => {
    const items = remoteBranchContextMenuItems(
      {
        name: 'remotes/origin/feature',
        head: 'abc',
        ahead: 0,
        behind: 0,
        isCurrent: false,
        isRemote: true
      },
      {
        onSelectCommit: noop,
        onCheckout: noop,
        onDeleteRemote: noop
      }
    )
    expect(items.some((item) => item.id === 'delete-remote')).toBe(true)
  })
})

describe('remoteFolderContextMenuItems', () => {
  it('includes fetch and optional edit URL', () => {
    const items = remoteFolderContextMenuItems('origin', false, {
      onToggle: noop,
      onFetch: noop,
      onEditUrl: noop
    })
    expect(items.map((item) => item.id)).toEqual(['toggle', 'fetch', 'edit-url', 'copy'])
  })

  it('includes delete remote when handler is provided', () => {
    const items = remoteFolderContextMenuItems('origin', false, {
      onToggle: noop,
      onFetch: noop,
      onDelete: noop
    })
    expect(items.some((item) => item.id === 'delete-remote')).toBe(true)
    expect(items.find((item) => item.id === 'delete-remote')?.danger).toBe(true)
  })
})

describe('stashContextMenuItems', () => {
  it('includes branch action when provided', () => {
    const withBranch = stashContextMenuItems(0, 'abc', 'wip', {
      onSelect: noop,
      onApply: noop,
      onPop: noop,
      onDrop: noop,
      onBranch: noop
    })
    const withoutBranch = stashContextMenuItems(0, 'abc', 'wip', {
      onSelect: noop,
      onApply: noop,
      onPop: noop,
      onDrop: noop
    })

    expect(withBranch.some((item) => item.id === 'branch')).toBe(true)
    expect(withoutBranch.some((item) => item.id === 'branch')).toBe(false)
  })
})

describe('tagContextMenuItems', () => {
  const localTag: GitTag = {
    name: 'v1.0.0',
    target: 'abc1234',
    isAnnotated: false,
    isRemote: false
  }

  it('offers checkout and push for local tags', () => {
    const items = tagContextMenuItems(localTag, {
      defaultRemote: 'origin',
      onSelectCommit: noop,
      onCheckout: noop,
      onPush: noop,
      onDelete: noop
    })

    expect(items.some((item) => item.id === 'checkout')).toBe(true)
    expect(items.find((item) => item.id === 'push')?.disabled).toBe(false)
  })

  it('shows remote delete for remote tags', () => {
    const items = tagContextMenuItems(
      { ...localTag, name: 'origin/v1.0.0', isRemote: true, remote: 'origin' },
      {
        onSelectCommit: noop,
        onCheckout: noop,
        onPush: noop,
        onDelete: noop
      }
    )

    expect(items.some((item) => item.id === 'delete-remote')).toBe(true)
    expect(items.some((item) => item.id === 'checkout')).toBe(false)
  })
})

describe('pullRequestContextMenuItems', () => {
  it('lists merge methods', () => {
    const items = pullRequestContextMenuItems(
      {
        number: 1,
        title: 'Fix bug',
        state: 'open',
        htmlUrl: 'https://github.com/org/repo/pull/1',
        user: 'alice',
        head: { ref: 'fix', sha: 'abc' },
        base: { ref: 'main', sha: 'def' },
        body: '',
        draft: false,
        mergeable: true
      },
      { onMerge: noop }
    )

    expect(items.map((item) => item.id)).toContain('merge')
    expect(items.map((item) => item.id)).toContain('squash')
    expect(items.map((item) => item.id)).toContain('rebase')
  })
})

describe('issueContextMenuItems', () => {
  it('includes branch from issue action', () => {
    const items = issueContextMenuItems(
      {
        number: 42,
        title: 'Login fails',
        state: 'open',
        htmlUrl: 'https://github.com/org/repo/issues/42',
        user: 'alice',
        body: '',
        labels: []
      },
      noop
    )

    expect(items.some((item) => item.id === 'branch')).toBe(true)
  })
})
