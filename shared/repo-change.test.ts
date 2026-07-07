import { describe, expect, it } from 'vitest'
import {
  allGitIpcInvalidationSuffixes,
  isRepoChangeDiffQuerySuffix,
  REPO_CHANGE_REFS_QUERY_SUFFIXES,
  REPO_CHANGE_WORKING_QUERY_SUFFIXES
} from './repo-change'

describe('repo-change', () => {
  it('lists ref-scoped query suffixes for graph and branch state', () => {
    expect(REPO_CHANGE_REFS_QUERY_SUFFIXES).toContain('log.graph')
    expect(REPO_CHANGE_REFS_QUERY_SUFFIXES).toContain('branch.list')
    expect(REPO_CHANGE_REFS_QUERY_SUFFIXES).toContain('working.status')
  })

  it('lists working-tree query suffixes', () => {
    expect(REPO_CHANGE_WORKING_QUERY_SUFFIXES).toEqual(['working.status'])
  })

  it('detects diff query suffixes', () => {
    expect(isRepoChangeDiffQuerySuffix('diff.working')).toBe(true)
    expect(isRepoChangeDiffQuerySuffix('diff.staged')).toBe(true)
    expect(isRepoChangeDiffQuerySuffix('log.graph')).toBe(false)
  })

  it('aggregates invalidation suffixes from IPC catalog', () => {
    const suffixes = allGitIpcInvalidationSuffixes()
    expect(suffixes).toContain('branch.list')
    expect(suffixes).toContain('working.status')
    expect(suffixes.length).toBeGreaterThan(10)
  })
})
