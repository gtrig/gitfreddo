import type {
  ForgeChangeRequest,
  ForgeCreateChangeRequestParams,
  ForgeIssue,
  ForgeListReposParams,
  ForgeMergeMethod,
  ForgeRepoBase
} from './forge'

export type { ForgeMergeMethod as GitHubMergeMethod }
export type { ForgeCreateChangeRequestParams as GitHubCreatePullRequestParams }
export type { ForgeIssue as GitHubIssue }
export type { ForgeListReposParams as GitHubListReposParams }
export { slugifyIssueBranch } from './forge'

export interface GitHubRepo extends ForgeRepoBase {
  id: number
}

export interface GitHubPullRequestRepository {
  owner: string
  repo: string
}

export interface GitHubPullRequest extends ForgeChangeRequest {
  repository: GitHubPullRequestRepository
}

export type GitHubPullRequestFileStatus =
  | 'added'
  | 'removed'
  | 'modified'
  | 'renamed'
  | 'copied'
  | 'changed'
  | 'unchanged'

export interface GitHubPullRequestFile {
  path: string
  status: GitHubPullRequestFileStatus
  additions: number
  deletions: number
  changes: number
}

export interface GitHubPullRequestCommit {
  sha: string
  subject: string
  message: string
  authorName: string
  authorLogin: string | null
  committedAt: string
}

export type GitHubPullRequestReviewCommentSide = 'LEFT' | 'RIGHT'

export interface GitHubPullRequestReviewCommentParams {
  body: string
  commitId: string
  path: string
  line: number
  side: GitHubPullRequestReviewCommentSide
}

export interface GitHubPullRequestConversationComment {
  id: number
  body: string
  user: string
  createdAt: string
  updatedAt: string
}

export interface GitHubPullRequestReviewComment {
  id: number
  body: string
  user: string
  createdAt: string
  updatedAt: string
  path: string
  line: number | null
  originalLine: number | null
  side: GitHubPullRequestReviewCommentSide | null
  commitId: string
}

export interface GitHubPullRequestReview {
  id: number
  body: string
  user: string
  state: string
  submittedAt: string
}

export interface GitHubPullRequestReviewThreadComment {
  id: number
  body: string
  user: string
  createdAt: string
  path: string | null
  line: number | null
}

export interface GitHubPullRequestReviewThread {
  id: string
  isResolved: boolean
  isOutdated: boolean
  path: string
  line: number | null
  comments: GitHubPullRequestReviewThreadComment[]
}

export type GitHubPullRequestTimelineKind = 'conversation' | 'line' | 'review'

export interface GitHubPullRequestTimelineItem {
  id: string
  kind: GitHubPullRequestTimelineKind
  body: string
  user: string
  createdAt: string
  path?: string
  line?: number | null
  side?: GitHubPullRequestReviewCommentSide | null
  reviewState?: string
}

export interface GitHubConnectProgress {
  userCode: string
  verificationUri: string
}

export interface GitHubCreateRepoParams {
  name: string
  description?: string
  private?: boolean
  autoInit?: boolean
  gitignoreTemplate?: string
  licenseTemplate?: string
}

export interface GitHubRepoContext {
  owner: string
  repo: string
  host: string
}

const GITHUB_HOST_PATTERN = /github\.com/i

export function parseGitHubRemote(url: string): GitHubRepoContext | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  const sshMatch = trimmed.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/i)
  if (sshMatch) {
    const host = sshMatch[1]
    if (!GITHUB_HOST_PATTERN.test(host) && !host.includes('.')) {
      return null
    }
    return {
      host,
      owner: sshMatch[2],
      repo: sshMatch[3].replace(/\.git$/i, '')
    }
  }

  try {
    const parsed = new URL(trimmed.replace(/\.git$/i, ''))
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    if (!GITHUB_HOST_PATTERN.test(parsed.hostname) && parsed.hostname !== 'github.com') {
      if (!parsed.hostname.endsWith('.github.com') && !parsed.hostname.includes('github')) {
        return null
      }
    }
    return {
      host: parsed.hostname,
      owner: parts[0],
      repo: parts[1]
    }
  } catch {
    return null
  }
}

export function parseGitHubPullHtmlUrl(htmlUrl: string): GitHubPullRequestRepository | null {
  const match = htmlUrl.trim().match(/github\.com\/([^/]+)\/([^/]+)\/pull\/\d+/i)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}
