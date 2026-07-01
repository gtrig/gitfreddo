import { describe, expect, it } from 'vitest'
import { parseWorktreeListPorcelain } from './worktree'

describe('parseWorktreeListPorcelain', () => {
  it('parses multiple worktrees with branches', () => {
    const stdout = `worktree /home/user/proj
HEAD abc123def456789012345678901234567890abcd
branch refs/heads/main

worktree /home/user/proj-feature
HEAD def456789012345678901234567890abcdef12
branch refs/heads/feature

`

    const blocks = parseWorktreeListPorcelain(stdout)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toEqual({
      path: '/home/user/proj',
      head: 'abc123def456789012345678901234567890abcd',
      branch: 'main',
      isDetached: false
    })
    expect(blocks[1]).toEqual({
      path: '/home/user/proj-feature',
      head: 'def456789012345678901234567890abcdef12',
      branch: 'feature',
      isDetached: false
    })
  })

  it('parses detached, bare, locked, and prunable worktrees', () => {
    const stdout = `worktree /repo/main
HEAD abc123def456789012345678901234567890abcd
branch refs/heads/main

worktree /repo/detached
HEAD def456789012345678901234567890abcdef12
detached

worktree /repo/bare
bare

worktree /repo/locked
HEAD abc123def456789012345678901234567890abcd
branch refs/heads/locked-branch
locked reason here

worktree /repo/stale
prunable gitdir file points to non-existent location

`

    const blocks = parseWorktreeListPorcelain(stdout)
    expect(blocks).toHaveLength(5)
    expect(blocks[1].isDetached).toBe(true)
    expect(blocks[1].branch).toBeUndefined()
    expect(blocks[2].isBare).toBe(true)
    expect(blocks[3].locked).toBe('reason here')
    expect(blocks[4].prunable).toBe('gitdir file points to non-existent location')
  })

  it('returns empty array for empty output', () => {
    expect(parseWorktreeListPorcelain('')).toEqual([])
    expect(parseWorktreeListPorcelain('\n\n')).toEqual([])
  })
})
