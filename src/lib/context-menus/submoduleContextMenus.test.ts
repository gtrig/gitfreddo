import { describe, expect, it, vi } from 'vitest'
import { submoduleContextMenuItems, submodulesSectionContextMenuItems } from './submoduleContextMenus'

const entry = {
  path: 'vendor/lib',
  name: 'vendor',
  url: 'https://example.com/lib.git',
  status: 'initialized' as const,
  hasWorkingTree: true
}

describe('submoduleContextMenuItems', () => {
  it('includes core actions', () => {
    const items = submoduleContextMenuItems(entry, {
      onOpenInTab: vi.fn(),
      onUpdate: vi.fn(),
      onSync: vi.fn()
    })
    expect(items.some((item) => item.id === 'open')).toBe(true)
    expect(items.some((item) => item.id === 'update')).toBe(true)
    expect(items.some((item) => item.id === 'sync')).toBe(true)
  })

  it('shows init for uninitialized submodules', () => {
    const items = submoduleContextMenuItems(
      { ...entry, status: 'uninitialized', hasWorkingTree: false },
      { onOpenInTab: vi.fn(), onInit: vi.fn() }
    )
    expect(items.some((item) => item.id === 'init')).toBe(true)
  })

  it('includes stage when handler is provided', () => {
    const items = submoduleContextMenuItems(entry, {
      onOpenInTab: vi.fn(),
      onStage: vi.fn()
    })
    expect(items.some((item) => item.id === 'stage')).toBe(true)
  })
})

describe('submodulesSectionContextMenuItems', () => {
  it('includes bulk actions when handlers are provided', () => {
    const items = submodulesSectionContextMenuItems({
      onUpdateAll: vi.fn(),
      onSyncAll: vi.fn()
    })
    expect(items.map((item) => item.id)).toEqual(['update-all', 'sync-all'])
  })
})
