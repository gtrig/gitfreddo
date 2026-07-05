import { describe, expect, it, vi } from 'vitest'
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
