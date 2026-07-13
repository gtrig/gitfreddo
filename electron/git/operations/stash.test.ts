import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../git-runner', () => ({
  runGitOrThrow: vi.fn()
}))

import { runGitOrThrow } from '../git-runner'
import {
  parseStashListLine,
  stashApply,
  stashBranch,
  stashDrop,
  stashFiles,
  stashList,
  stashPop,
  stashPush,
  stashShow
} from './stash'

describe('parseStashListLine', () => {
  it('parses stash list lines with branch names', () => {
    const line = 'stash@{0}\x1fabc123def456\x1fWIP on main: save work'
    expect(parseStashListLine(line, 0)).toEqual({
      index: 0,
      message: 'WIP on main: save work',
      branch: 'main',
      hash: 'abc123def456'
    })
  })

  it('handles custom stash messages without branch info', () => {
    const line = 'stash@{1}\x1fdef456abc123\x1fon login screen'
    expect(parseStashListLine(line, 1)).toEqual({
      index: 1,
      message: 'on login screen',
      branch: '',
      hash: 'def456abc123'
    })
  })

  it('returns null for blank lines', () => {
    expect(parseStashListLine('', 0)).toBeNull()
    expect(parseStashListLine('   ', 0)).toBeNull()
  })
})

describe('stash git operations', () => {
  beforeEach(() => {
    vi.mocked(runGitOrThrow).mockReset()
    vi.mocked(runGitOrThrow).mockResolvedValue('')
  })

  it('lists parsed stash entries', async () => {
    vi.mocked(runGitOrThrow).mockResolvedValue(
      'stash@{0}\x1fabc123\x1fWIP on main: save work\n'
    )
    await expect(stashList('/repo', 'git')).resolves.toEqual([
      { index: 0, message: 'WIP on main: save work', branch: 'main', hash: 'abc123' }
    ])
  })

  it('returns an empty list when git reports no stashes', async () => {
    vi.mocked(runGitOrThrow).mockResolvedValue('\n')
    await expect(stashList('/repo', 'git')).resolves.toEqual([])
  })

  it('runs stash push, branch, pop, apply, drop, show, and files commands', async () => {
    vi.mocked(runGitOrThrow).mockResolvedValue('diff\n')

    await stashPush('/repo', 'git', 'wip', { includeUntracked: true, paths: ['src'] })
    await stashBranch('/repo', 'git', 'stash-branch', 1)
    await stashPop('/repo', 'git', 2)
    await stashApply('/repo', 'git', 0)
    await stashDrop('/repo', 'git', 0)
    await expect(stashShow('/repo', 'git', 0, 'README.md')).resolves.toEqual({
      unified: 'diff\n',
      path: 'README.md'
    })
    await expect(stashFiles('/repo', 'git', 0)).resolves.toBe('diff\n')

    expect(runGitOrThrow).toHaveBeenCalled()
  })
})
