import { describe, expect, it } from 'vitest'
import type { GitWorkingStatus } from '@/lib/types'
import { countWorkingChanges } from '@/lib/workspace/workingChanges'

function status(partial: Partial<GitWorkingStatus>): GitWorkingStatus {
  return {
    branch: 'main',
    ahead: 0,
    behind: 0,
    staged: [],
    unstaged: [],
    untracked: [],
    conflicted: [],
    isClean: false,
    mergeInProgress: false,
    rebaseInProgress: false,
    cherryPickInProgress: false,
    ...partial
  }
}

describe('countWorkingChanges', () => {
  it('counts unique paths across staged and unstaged', () => {
    const counts = countWorkingChanges(
      status({
        staged: [{ path: 'a.ts', status: 'added' }],
        unstaged: [
          { path: 'b.ts', status: 'modified' },
          { path: 'c.ts', status: 'deleted' }
        ],
        untracked: [{ path: 'd.ts', status: 'untracked' }]
      })
    )

    expect(counts).toEqual({ added: 2, modified: 1, deleted: 1 })
  })

  it('dedupes the same path to a single bucket', () => {
    const counts = countWorkingChanges(
      status({
        staged: [{ path: 'a.ts', status: 'modified' }],
        unstaged: [{ path: 'a.ts', status: 'modified' }]
      })
    )

    expect(counts).toEqual({ added: 0, modified: 1, deleted: 0 })
  })
})
