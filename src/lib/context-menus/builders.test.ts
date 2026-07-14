import { describe, expect, it, vi } from 'vitest'
import {
  branchLabelText,
  copyItem,
  inProgressMenuGroup,
  menuLabel,
  separator,
  toggleLabel
} from './builders'

describe('context menu builders', () => {
  it('builds separators and i18n labels', () => {
    expect(separator('sep').separator).toBe(true)
    expect(menuLabel(undefined, 'key', 'Fallback')).toBe('Fallback')
    expect(menuLabel(((key: string) => `t:${key}`) as never, 'key', 'Fallback')).toBe('t:key')
  })

  it('toggles expand/collapse labels', () => {
    expect(toggleLabel(undefined, true)).toBe('Collapse')
    expect(toggleLabel(undefined, false)).toBe('Expand')
  })

  it('formats branch labels for detached HEAD', () => {
    expect(branchLabelText(undefined, true, 'main')).toBe('detached HEAD')
    expect(branchLabelText(undefined, false, '')).toBe('current branch')
    expect(branchLabelText(undefined, false, 'main')).toBe('main')
  })

  it('builds copy items', () => {
    const item = copyItem('copy', 'Copy', 'value')
    expect(item.id).toBe('copy')
    expect(typeof item.onClick).toBe('function')
  })

  it('builds in-progress operation groups', () => {
    const continueFn = vi.fn()
    const abortFn = vi.fn()
    const rebase = inProgressMenuGroup('rebase', { continue: continueFn, abort: abortFn, skip: vi.fn() })
    expect(rebase.map((item) => item.id)).toEqual([
      'rebase-continue',
      'rebase-skip',
      'rebase-abort',
      'sep-rebase'
    ])

    const merge = inProgressMenuGroup('merge', { continue: continueFn, abort: abortFn })
    expect(merge.map((item) => item.id)).toEqual(['merge-continue', 'merge-abort', 'sep-merge'])
  })
})
