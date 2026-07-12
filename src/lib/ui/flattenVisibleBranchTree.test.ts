import { describe, expect, it } from 'vitest'
import { buildLocalBranchTree } from '@/lib/workspace/branchTree'
import { flattenVisibleBranchTree } from './flattenVisibleBranchTree'
import type { GitBranch } from '@/lib/types'

function branch(name: string): GitBranch {
  return { name, head: 'abc', isCurrent: false, isRemote: false, ahead: 0, behind: 0 }
}

describe('flattenVisibleBranchTree', () => {
  it('returns empty array for empty input', () => {
    expect(flattenVisibleBranchTree([], new Set())).toEqual([])
  })

  it('returns flat branches at depth 0 with no folders', () => {
    const nodes = buildLocalBranchTree([branch('main'), branch('develop')])
    const items = flattenVisibleBranchTree(nodes, new Set())
    expect(items.every((i) => i.kind === 'branch')).toBe(true)
    expect(items.every((i) => i.depth === 0)).toBe(true)
  })

  it('shows folder at depth 0 but hides children when closed', () => {
    const nodes = buildLocalBranchTree([branch('feat/a'), branch('feat/b')])
    const items = flattenVisibleBranchTree(nodes, new Set())
    expect(items).toHaveLength(1)
    expect(items[0]?.kind).toBe('folder')
    expect(items[0]?.id).toBe('folder:feat')
  })

  it('shows folder children when open', () => {
    const nodes = buildLocalBranchTree([branch('feat/a'), branch('feat/b')])
    const items = flattenVisibleBranchTree(nodes, new Set(['feat']))
    expect(items).toHaveLength(3)
    expect(items[0]?.kind).toBe('folder')
    expect(items[1]?.kind).toBe('branch')
    expect(items[1]?.depth).toBe(1)
  })

  it('treats all folders as open when filter is non-empty', () => {
    const nodes = buildLocalBranchTree([branch('feat/a')])
    const items = flattenVisibleBranchTree(nodes, new Set(), 'feat')
    expect(items.map((i) => i.kind)).toEqual(['folder', 'branch'])
  })

  it('handles nested folder paths correctly', () => {
    const nodes = buildLocalBranchTree([branch('team/feat/x'), branch('team/fix/y')])
    const items = flattenVisibleBranchTree(nodes, new Set(['team', 'team/feat', 'team/fix']))
    const ids = items.map((i) => i.id)
    expect(ids).toContain('folder:team')
    expect(ids).toContain('folder:team/feat')
    expect(ids).toContain('branch:team/feat/x')
    expect(ids).toContain('folder:team/fix')
    expect(ids).toContain('branch:team/fix/y')
  })

  it('assigns stable ids', () => {
    const nodes = buildLocalBranchTree([branch('main'), branch('feat/a')])
    const items1 = flattenVisibleBranchTree(nodes, new Set())
    const items2 = flattenVisibleBranchTree(nodes, new Set(['feat']))
    expect(items1[0]?.id).toBe(items2[0]?.id)
  })
})
