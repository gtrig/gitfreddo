import { describe, expect, it } from 'vitest'
import type { GitBranch } from '@/lib/types'
import {
  buildLocalBranchTree,
  buildRemoteBranchGroups,
  countBranchTreeNodes,
  filterBranchTree,
  matchesFilter,
  parseRemoteBranchName,
  remoteBranchShortName
} from '@/lib/workspace/branchTree'

function branch(name: string, overrides: Partial<GitBranch> = {}): GitBranch {
  return {
    name,
    head: 'abc',
    ahead: 0,
    behind: 0,
    isCurrent: false,
    isRemote: name.startsWith('remotes/'),
    ...overrides
  }
}

describe('parseRemoteBranchName', () => {
  it('parses remote-tracking branch names', () => {
    expect(parseRemoteBranchName('remotes/origin/main')).toEqual({
      remote: 'origin',
      branch: 'main'
    })
    expect(parseRemoteBranchName('main')).toBeNull()
  })
})

describe('remoteBranchShortName', () => {
  it('returns the branch portion of a remote ref', () => {
    expect(remoteBranchShortName('remotes/origin/feature/login')).toBe('feature/login')
    expect(remoteBranchShortName('main')).toBe('main')
  })
})

describe('buildLocalBranchTree', () => {
  it('nests slash-separated branches into folders', () => {
    const tree = buildLocalBranchTree([
      branch('feature/login'),
      branch('feature/oauth'),
      branch('main')
    ])

    expect(tree.map((node) => node.name)).toEqual(['feature', 'main'])
    expect(tree[0]?.type).toBe('folder')
    expect(tree[0]?.children?.map((node) => node.name)).toEqual(['login', 'oauth'])
    expect(countBranchTreeNodes(tree)).toBe(3)
  })
})

describe('filterBranchTree', () => {
  it('keeps folders that contain matching branches', () => {
    const tree = buildLocalBranchTree([branch('feature/login'), branch('feature/oauth'), branch('main')])
    const filtered = filterBranchTree(tree, 'login')

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.children).toHaveLength(1)
    expect(filtered[0]?.children?.[0]?.name).toBe('login')
  })
})

describe('matchesFilter', () => {
  it('matches case-insensitively and treats blank queries as pass-through', () => {
    expect(matchesFilter('Feature/Login', 'login')).toBe(true)
    expect(matchesFilter('main', 'dev')).toBe(false)
    expect(matchesFilter('main', '  ')).toBe(true)
  })
})

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
