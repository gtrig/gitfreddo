import { describe, expect, it } from 'vitest'
import {
  buildPullRequestAnalysisContext,
  resolvePullRequestAnalysisScope
} from './analyzePullRequest'
import type { GitHubPullRequest, GitHubPullRequestCommit, GitHubPullRequestFile } from '@shared/github'

const pr: GitHubPullRequest = {
  number: 7,
  title: 'Add feature',
  state: 'open',
  htmlUrl: 'https://github.com/o/r/pull/7',
  repository: { owner: 'o', repo: 'r' },
  user: 'dev',
  head: { ref: 'feature', sha: 'headsha' },
  base: { ref: 'main', sha: 'basesha' },
  body: 'Summary',
  draft: false,
  mergeable: true
}

const files: GitHubPullRequestFile[] = [
  { path: 'src/a.ts', status: 'modified', additions: 2, deletions: 1, changes: 3 },
  { path: 'src/b.ts', status: 'modified', additions: 1, deletions: 0, changes: 1 }
]

const commits: GitHubPullRequestCommit[] = [
  {
    sha: 'abc',
    subject: 'First change',
    message: 'First change',
    authorName: 'Dev',
    authorLogin: 'dev',
    committedAt: '2026-01-01T00:00:00Z'
  }
]

describe('analyzePullRequest', () => {
  it('treats all files as full scope when none are selected', () => {
    expect(resolvePullRequestAnalysisScope(['src/a.ts', 'src/b.ts'], [])).toEqual({
      scope: 'full',
      filePaths: ['src/a.ts', 'src/b.ts']
    })
  })

  it('uses partial scope for a subset of files', () => {
    expect(resolvePullRequestAnalysisScope(['src/a.ts', 'src/b.ts'], ['src/a.ts'])).toEqual({
      scope: 'partial',
      filePaths: ['src/a.ts']
    })
  })

  it('builds AI context for a pull request analysis', () => {
    const context = buildPullRequestAnalysisContext(pr, files, commits, 'partial', ['src/a.ts'])

    expect(context).toMatchObject({
      prNumber: 7,
      prTitle: 'Add feature',
      headSha: 'headsha',
      baseSha: 'basesha',
      analysisScope: 'partial',
      filePaths: ['src/a.ts'],
      commitSubjects: ['First change']
    })
    expect(context.changedFileStats).toEqual([{ path: 'src/a.ts', additions: 2, deletions: 1 }])
  })
})
