import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { GitBranch, GitTag, GitWorktreeEntry } from '@/lib/types'
import { clickAllMenuItems } from '@/test/contextMenuTestUtils'
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
    expect(items[0]?.id).toBe('toggle')
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
    expect(items.some((item) => item.id === 'squash-merge-into')).toBe(false)
  })

  it('offers squash and merge into when handler is provided for the current branch', () => {
    const items = localBranchContextMenuItems(branch({ isCurrent: true }), {
      onCheckout: noop,
      onSelectCommit: noop,
      onMerge: noop,
      onSquashMergeInto: noop,
      onRename: noop,
      onDelete: noop
    })

    expect(items.find((item) => item.id === 'squash-merge-into')?.label).toBe(
      'Squash and merge into…'
    )
  })

  it('falls back to "Merge into current" when the current branch name is unknown', () => {
    const items = localBranchContextMenuItems(branch(), {
      onCheckout: noop,
      onSelectCommit: noop,
      onMerge: noop,
      onRename: noop,
      onDelete: noop
    })

    expect(items.find((item) => item.id === 'merge')?.label).toBe('Merge into current…')
    expect(items.some((item) => item.id === 'merge-current-into')).toBe(false)
  })

  it('offers both merge directions when the current branch and reverse handler are provided', () => {
    const onMerge = vi.fn()
    const onMergeCurrentInto = vi.fn()
    const onFastForward = vi.fn()
    const onFastForwardBranch = vi.fn()
    const items = localBranchContextMenuItems(branch({ name: 'feature/login' }), {
      onCheckout: noop,
      onSelectCommit: noop,
      onMerge,
      onMergeCurrentInto,
      onFastForward,
      onFastForwardBranch,
      currentBranch: 'main',
      onRename: noop,
      onDelete: noop
    })

    const merge = items.find((item) => item.id === 'merge')
    const reverse = items.find((item) => item.id === 'merge-current-into')
    const ffCurrent = items.find((item) => item.id === 'fast-forward')
    const ffBranch = items.find((item) => item.id === 'fast-forward-branch')
    expect(merge?.label).toBe('Merge feature/login into main…')
    expect(reverse?.label).toBe('Merge main into feature/login…')
    expect(ffCurrent?.label).toBe('Fast-forward main to feature/login')
    expect(ffBranch?.label).toBe('Fast-forward feature/login to main')

    merge?.onClick?.()
    reverse?.onClick?.()
    ffCurrent?.onClick?.()
    ffBranch?.onClick?.()
    expect(onMerge).toHaveBeenCalledWith('feature/login')
    expect(onMergeCurrentInto).toHaveBeenCalledWith('feature/login')
    expect(onFastForward).toHaveBeenCalledWith('feature/login')
    expect(onFastForwardBranch).toHaveBeenCalledWith('feature/login')
  })

  it('omits the reverse merge direction when no reverse handler is provided', () => {
    const items = localBranchContextMenuItems(branch(), {
      onCheckout: noop,
      onSelectCommit: noop,
      onMerge: noop,
      currentBranch: 'main',
      onRename: noop,
      onDelete: noop
    })

    expect(items.find((item) => item.id === 'merge')?.label).toBe('Merge feature/login into main…')
    expect(items.some((item) => item.id === 'merge-current-into')).toBe(false)
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

  it('offers graph visibility toggle when handler is provided', () => {
    const items = localBranchContextMenuItems(branch(), {
      onCheckout: noop,
      onSelectCommit: noop,
      onMerge: noop,
      onRename: noop,
      onDelete: noop,
      onToggleGraphVisibility: noop,
      isHiddenInGraph: true
    })

    const toggle = items.find((item) => item.id === 'toggle-graph-visibility')
    expect(toggle?.label).toBe('Show in graph')
    expect(toggle?.checked).toBe(false)
  })

  it('disables graph visibility toggle for the current branch', () => {
    const items = localBranchContextMenuItems(branch({ isCurrent: true }), {
      onCheckout: noop,
      onSelectCommit: noop,
      onMerge: noop,
      onRename: noop,
      onDelete: noop,
      onToggleGraphVisibility: noop,
      isHiddenInGraph: false
    })

    expect(items.find((item) => item.id === 'toggle-graph-visibility')?.disabled).toBe(true)
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

  it('offers graph visibility toggle when handler is provided', () => {
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
        onToggleGraphVisibility: noop,
        isHiddenInGraph: false
      }
    )

    const toggle = items.find((item) => item.id === 'toggle-graph-visibility')
    expect(toggle?.label).toBe('Hide from graph')
    expect(toggle?.checked).toBe(true)
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
      { onBranchFromIssue: noop }
    )

    expect(items.some((item) => item.id === 'branch')).toBe(true)
  })
})

describe('menu handler invocation', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { open: vi.fn() })
  })

  it('invokes all local branch menu handlers', () => {
    const handlers = {
      onCheckout: vi.fn(),
      onSelectCommit: vi.fn(),
      onMerge: vi.fn(),
      onSquashMergeInto: vi.fn(),
      onRename: vi.fn(),
      onDelete: vi.fn(),
      onSetUpstream: vi.fn(),
      onUnsetUpstream: vi.fn(),
      onCreatePr: vi.fn(),
      onCheckoutInWorktree: vi.fn(),
      onToggleGraphVisibility: vi.fn(),
      isHiddenInGraph: true
    }

    clickAllMenuItems(
      localBranchContextMenuItems(
        branch({ isCurrent: true, upstream: 'origin/main', ahead: 2 }),
        handlers
      )
    )
    clickAllMenuItems(
      localBranchContextMenuItems(branch({ ahead: 3, upstream: 'origin/main' }), handlers)
    )

    expect(handlers.onCheckout).toHaveBeenCalled()
    expect(handlers.onSquashMergeInto).toHaveBeenCalled()
    expect(handlers.onCreatePr).toHaveBeenCalled()
    expect(handlers.onSetUpstream).toHaveBeenCalled()
    expect(handlers.onUnsetUpstream).toHaveBeenCalled()
  })

  it('invokes handlers for other sidebar menus', () => {
    const worktreeHandlers = {
      onOpenInTab: vi.fn(),
      onRemove: vi.fn(),
      onCopyPath: vi.fn()
    }
    const entry: GitWorktreeEntry = {
      path: '/tmp/wt',
      head: 'abc',
      branch: 'feature',
      isDetached: false,
      isMain: false,
      isBare: false,
      locked: 'reason'
    }
    clickAllMenuItems(worktreeContextMenuItems(entry, worktreeHandlers))
    clickAllMenuItems(folderContextMenuItems('origin', false, vi.fn()))
    clickAllMenuItems(
      remoteFolderContextMenuItems('origin', true, {
        onToggle: vi.fn(),
        onFetch: vi.fn(),
        onEditUrl: vi.fn(),
        onRename: vi.fn(),
        onDelete: vi.fn()
      })
    )
    clickAllMenuItems(
      remoteBranchContextMenuItems(branch({ name: 'origin/feature', isRemote: true }), {
        onSelectCommit: vi.fn(),
        onCheckout: vi.fn(),
        onDeleteRemote: vi.fn(),
        onToggleGraphVisibility: vi.fn(),
        isHiddenInGraph: false
      })
    )
    clickAllMenuItems(
      stashContextMenuItems(0, 'abc', 'wip', {
        onSelect: vi.fn(),
        onApply: vi.fn(),
        onPop: vi.fn(),
        onDrop: vi.fn(),
        onBranch: vi.fn()
      })
    )

    const localTag: GitTag = {
      name: 'v1.0.0',
      target: 'abc1234',
      isAnnotated: false,
      isRemote: false
    }
    clickAllMenuItems(
      tagContextMenuItems(localTag, {
        defaultRemote: 'origin',
        onSelectCommit: vi.fn(),
        onCheckout: vi.fn(),
        onPush: vi.fn(),
        onRename: vi.fn(),
        onDelete: vi.fn()
      })
    )
    clickAllMenuItems(
      tagContextMenuItems(
        { ...localTag, name: 'origin/v1.0.0', isRemote: true, remote: 'origin' },
        { onSelectCommit: vi.fn(), onCheckout: vi.fn(), onPush: vi.fn(), onDelete: vi.fn() }
      )
    )
    clickAllMenuItems(
      pullRequestContextMenuItems(
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
        { onMerge: vi.fn() }
      )
    )
    clickAllMenuItems(
      issueContextMenuItems(
        {
          number: 42,
          title: 'Login fails',
          state: 'open',
          htmlUrl: 'https://github.com/org/repo/issues/42',
          user: 'alice',
          body: '',
          labels: []
        },
        { onBranchFromIssue: vi.fn(), onEdit: vi.fn(), onClose: vi.fn() }
      )
    )

    expect(worktreeHandlers.onOpenInTab).toHaveBeenCalled()
  })
})
