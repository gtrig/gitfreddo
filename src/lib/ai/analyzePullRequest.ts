import type {
  AiFillContext,
  AiPullRequestAnalysisScope,
  AiPullRequestChangedFileStat
} from '@shared/ai'
import type { GitHubPullRequest, GitHubPullRequestCommit, GitHubPullRequestFile } from '@shared/github'

export function resolvePullRequestAnalysisScope(
  allFilePaths: string[],
  selectedFilePaths: string[]
): { scope: AiPullRequestAnalysisScope; filePaths: string[] } {
  const selected = [...new Set(selectedFilePaths)].filter((path) => allFilePaths.includes(path))
  if (selected.length === 0 || selected.length === allFilePaths.length) {
    return { scope: 'full', filePaths: allFilePaths }
  }
  return { scope: 'partial', filePaths: selected.sort((a, b) => a.localeCompare(b)) }
}

export function buildPullRequestChangedFileStats(
  files: GitHubPullRequestFile[],
  filePaths: string[]
): AiPullRequestChangedFileStat[] {
  const allowed = new Set(filePaths)
  return files
    .filter((file) => allowed.has(file.path))
    .map((file) => ({
      path: file.path,
      additions: file.additions,
      deletions: file.deletions
    }))
}

export function buildPullRequestAnalysisContext(
  pr: GitHubPullRequest,
  files: GitHubPullRequestFile[],
  commits: GitHubPullRequestCommit[],
  scope: AiPullRequestAnalysisScope,
  filePaths: string[]
): AiFillContext {
  return {
    prNumber: pr.number,
    prTitle: pr.title,
    prBody: pr.body,
    headBranch: pr.head.ref,
    baseBranch: pr.base.ref,
    headSha: pr.head.sha,
    baseSha: pr.base.sha,
    analysisScope: scope,
    filePaths,
    changedFileStats: buildPullRequestChangedFileStats(files, filePaths),
    commitSubjects: commits.map((commit) => commit.subject)
  }
}

export function pullRequestAnalysisScopeKey(
  prNumber: number,
  scope: AiPullRequestAnalysisScope,
  filePaths: string[]
): string {
  return `${prNumber}:${scope}:${filePaths.join('|')}`
}
