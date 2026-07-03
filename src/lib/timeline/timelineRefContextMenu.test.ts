import { describe, expect, it, vi } from 'vitest'
import {
  buildTimelineRefContextMenuItems,
  findBranchForTimelineRef,
  findTagForTimelineRef
} from '@/lib/timeline/timelineRefContextMenu'
import type { GitBranch, GitTag } from '@/lib/types'

const handlers = {
  onSelectCommit: vi.fn(),
  onCheckout: vi.fn(),
  onMerge: vi.fn(),
  onRenameBranch: vi.fn(),
  onDeleteBranch: vi.fn(),
  onCheckoutRemote: vi.fn(),
  onDeleteRemoteBranch: vi.fn(),
  onPushTag: vi.fn(),
  onRenameTag: vi.fn(),
  onDeleteTag: vi.fn(),
  defaultRemote: 'origin'
}

describe('timelineRefContextMenu', () => {
  it('builds local branch menu items', () => {
    const branches: GitBranch[] = [
      {
        name: 'main',
        head: 'abc123',
        ahead: 0,
        behind: 0,
        isCurrent: true,
        isRemote: false
      }
    ]

    const items = buildTimelineRefContextMenuItems(
      { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 0 },
      'abc123',
      branches,
      [],
      'main',
      handlers
    )

    expect(items?.some((item) => item.id === 'checkout')).toBe(true)
    expect(items?.some((item) => item.id === 'merge')).toBe(false)
  })

  it('builds remote branch menu items', () => {
    const branches: GitBranch[] = [
      {
        name: 'remotes/origin/feature',
        head: 'abc123',
        ahead: 0,
        behind: 0,
        isCurrent: false,
        isRemote: true
      }
    ]

    const items = buildTimelineRefContextMenuItems(
      { label: 'origin/feature', kind: 'remote', fullRef: 'origin/feature', sourceOrder: 0 },
      'abc123',
      branches,
      [],
      'main',
      handlers
    )

    expect(items?.some((item) => item.id === 'checkout')).toBe(true)
    expect(items?.some((item) => item.id === 'focus')).toBe(true)
  })

  it('builds tag menu items', () => {
    const tags: GitTag[] = [
      {
        name: 'v1.0.0',
        target: 'abc123',
        isAnnotated: false,
        isRemote: false
      }
    ]

    const items = buildTimelineRefContextMenuItems(
      { label: 'v1.0.0', kind: 'tag', fullRef: 'v1.0.0', sourceOrder: 0 },
      'abc123',
      [],
      tags,
      'main',
      handlers
    )

    expect(items?.some((item) => item.id === 'checkout')).toBe(true)
    expect(items?.some((item) => item.id === 'copy-name')).toBe(true)
  })

  it('falls back to synthetic branch data when not listed', () => {
    const branch = findBranchForTimelineRef([], {
      label: 'feature',
      kind: 'branch',
      fullRef: 'feature',
      sourceOrder: 0
    }, 'deadbeef', 'main')

    expect(branch).toEqual({
      name: 'feature',
      head: 'deadbeef',
      ahead: 0,
      behind: 0,
      isCurrent: false,
      isRemote: false
    })
  })

  it('falls back to synthetic tag data when not listed', () => {
    const tag = findTagForTimelineRef(
      [],
      { label: 'v2.0.0', kind: 'tag', fullRef: 'v2.0.0', sourceOrder: 0 },
      'deadbeef'
    )

    expect(tag).toEqual({
      name: 'v2.0.0',
      target: 'deadbeef',
      isAnnotated: false,
      isRemote: false
    })
  })
})
