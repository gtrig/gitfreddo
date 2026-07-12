import { describe, expect, it, vi } from 'vitest'
import { clickAllMenuItems } from '@/test/contextMenuTestUtils'
import {
  commitFileContextMenuItems,
  commitFolderContextMenuItems,
  workingTreeFileContextMenuItems,
  workingTreeFolderContextMenuItems
} from './detailPanelContextMenus'

const noop = () => {}

describe('workingTreeFolderContextMenuItems', () => {
  it('includes expand/collapse and optional staging actions', () => {
    const items = workingTreeFolderContextMenuItems('src/lib', true, 'working', {
      onToggle: noop,
      onStageFolder: noop,
      onDiscardFolder: noop
    })

    expect(items.map((item) => item.id)).toEqual([
      'toggle',
      'copy',
      'stage-folder',
      'sep-discard',
      'discard-folder'
    ])
    expect(items.find((item) => item.id === 'toggle')?.label).toBe('Collapse')
    expect(items.find((item) => item.id === 'stage-folder')?.label).toBe('Stage folder contents')
  })

  it('includes add path to gitignore when handler is provided', () => {
    const items = workingTreeFolderContextMenuItems('build', false, 'working', {
      onToggle: noop,
      onAddToGitignore: noop
    })

    expect(items.some((item) => item.id === 'gitignore')).toBe(true)
    expect(items.find((item) => item.id === 'gitignore')?.label).toBe('Add path to .gitignore')
  })
})

describe('workingTreeFileContextMenuItems', () => {
  it('omits discard for untracked files but keeps delete', () => {
    const items = workingTreeFileContextMenuItems('new.ts', 'working', 'untracked', {
      onSelect: noop,
      onStageToggle: noop,
      onOpenInEditor: noop,
      onDelete: noop
    })

    expect(items.some((item) => item.id === 'discard')).toBe(false)
    expect(items.some((item) => item.id === 'delete')).toBe(true)
  })

  it('shows discard for modified tracked files', () => {
    const items = workingTreeFileContextMenuItems('src/app.ts', 'working', 'modified', {
      onSelect: noop,
      onStageToggle: noop,
      onOpenInEditor: noop,
      onDiscard: noop
    })

    expect(items.some((item) => item.id === 'discard')).toBe(true)
  })

  it('includes add to gitignore when handler is provided', () => {
    const items = workingTreeFileContextMenuItems('noise.log', 'working', 'untracked', {
      onSelect: noop,
      onStageToggle: noop,
      onOpenInEditor: noop,
      onAddToGitignore: noop
    })

    expect(items.some((item) => item.id === 'gitignore')).toBe(true)
  })

  it('omits add to gitignore for deleted and conflicted files', () => {
    const deleted = workingTreeFileContextMenuItems('gone.ts', 'working', 'deleted', {
      onSelect: noop,
      onStageToggle: noop,
      onOpenInEditor: noop,
      onAddToGitignore: noop
    })
    const conflicted = workingTreeFileContextMenuItems('conflict.ts', 'working', 'conflicted', {
      onSelect: noop,
      onStageToggle: noop,
      onOpenInEditor: noop,
      onAddToGitignore: noop
    })

    expect(deleted.some((item) => item.id === 'gitignore')).toBe(false)
    expect(conflicted.some((item) => item.id === 'gitignore')).toBe(false)
  })

  it('uses submodule actions instead of file editor actions', () => {
    const items = workingTreeFileContextMenuItems(
      'vendor/lib',
      'working',
      'modified',
      {
        onSelect: noop,
        onStageToggle: noop,
        onOpenInEditor: noop,
        onOpenSubmodule: noop,
        onUpdateSubmodule: noop,
        onSyncSubmodule: noop,
        onRename: noop,
        onDiscard: noop,
        onAddToGitignore: noop
      },
      { isSubmodule: true }
    )

    expect(items.some((item) => item.id === 'open-submodule')).toBe(true)
    expect(items.some((item) => item.id === 'open')).toBe(false)
    expect(items.some((item) => item.id === 'discard')).toBe(false)
    expect(items.some((item) => item.id === 'gitignore')).toBe(false)
    expect(items.some((item) => item.id === 'submodule-update')).toBe(true)
  })
})

describe('commitFolderContextMenuItems', () => {
  it('toggles folder labels', () => {
    const onToggle = vi.fn()
    const items = commitFolderContextMenuItems('src', false, onToggle)
    expect(items[0]?.id).toBe('toggle')
    expect(items[0]?.label).toBe('Expand')
    items[0]?.onClick()
    expect(onToggle).toHaveBeenCalledOnce()
  })
})

describe('commitFileContextMenuItems', () => {
  it('includes optional file history', () => {
    const withHistory = commitFileContextMenuItems('src/a.ts', 'a.ts', noop, noop)
    const withoutHistory = commitFileContextMenuItems('src/a.ts', 'a.ts', noop)

    expect(withHistory.some((item) => item.id === 'history')).toBe(true)
    expect(withoutHistory.some((item) => item.id === 'history')).toBe(false)
  })
})

describe('menu handler invocation', () => {
  it('invokes working tree and commit menu handlers', () => {
    const handlers = {
      onSelect: vi.fn(),
      onStageToggle: vi.fn(),
      onOpenInEditor: vi.fn(),
      onDiscard: vi.fn(),
      onDelete: vi.fn(),
      onRemove: vi.fn(),
      onRename: vi.fn(),
      onFileHistory: vi.fn(),
      onAddToGitignore: vi.fn(),
      onOpenSubmodule: vi.fn(),
      onUpdateSubmodule: vi.fn(),
      onSyncSubmodule: vi.fn(),
      onToggle: vi.fn(),
      onStageFolder: vi.fn(),
      onDiscardFolder: vi.fn()
    }

    clickAllMenuItems(
      workingTreeFileContextMenuItems('src/app.ts', 'working', 'modified', handlers, {
        isSubmodule: false
      })
    )
    clickAllMenuItems(
      workingTreeFolderContextMenuItems('src', true, 'working', {
        onToggle: handlers.onToggle,
        onStageFolder: handlers.onStageFolder,
        onDiscardFolder: handlers.onDiscardFolder,
        onAddToGitignore: handlers.onAddToGitignore
      })
    )
    clickAllMenuItems(commitFolderContextMenuItems('src', true, handlers.onToggle))
    clickAllMenuItems(commitFileContextMenuItems('src/a.ts', 'a.ts', handlers.onSelect, handlers.onFileHistory))

    expect(handlers.onSelect).toHaveBeenCalled()
    expect(handlers.onStageToggle).toHaveBeenCalled()
  })
})
