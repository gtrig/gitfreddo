import { describe, expect, it } from 'vitest'
import type { GitBranch } from '@/lib/types'
import { buildRemoteBranchGroups } from '@/lib/workspace/branchTree'

describe('buildRemoteBranchGroups', () => {
  it('groups remote-tracking branches by remote name', () => {
    const branches: GitBranch[] = [
      {
        name: 'remotes/gitfreddo/main',
        head: 'abc',
        ahead: 0,
        behind: 0,
        isCurrent: false,
        isRemote: true
      },
      {
        name: 'remotes/origin/feature/login',
        head: 'def',
        ahead: 0,
        behind: 0,
        isCurrent: false,
        isRemote: true
      }
    ]

    const groups = buildRemoteBranchGroups(branches)

    expect([...groups.keys()]).toEqual(['gitfreddo', 'origin'])
    expect(groups.get('gitfreddo')?.map((branch) => branch.name)).toEqual([
      'remotes/gitfreddo/main'
    ])
    expect(groups.get('origin')?.map((branch) => branch.name)).toEqual([
      'remotes/origin/feature/login'
    ])
  })
})
