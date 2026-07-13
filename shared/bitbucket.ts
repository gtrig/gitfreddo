export interface BitbucketRepo {
  uuid: string
  fullName: string
  name: string
  workspace: string
  owner: string
  private: boolean
  cloneUrl: string
  description: string | null
  defaultBranch: string
}

export interface BitbucketPullRequest {
  number: number
  title: string
  state: string
  htmlUrl: string
  user: string
  head: { ref: string; sha: string }
  base: { ref: string; sha: string }
  body: string
  draft: boolean
  mergeable: boolean | null
}

export type BitbucketMergeMethod = 'merge' | 'squash' | 'rebase'

export interface BitbucketCreatePullRequestParams {
  title: string
  head: string
  base: string
  body?: string
  draft?: boolean
}

export interface BitbucketIssue {
  number: number
  title: string
  state: string
  htmlUrl: string
  user: string
  body: string
  labels: string[]
}

export type BitbucketConnectStatus = 'waiting' | 'exchanging' | 'done'

export interface BitbucketConnectProgress {
  status: BitbucketConnectStatus
  authorizationUri?: string
}

export interface BitbucketListReposParams {
  search?: string
  page?: number
}

export interface BitbucketCreateRepoParams {
  workspace: string
  name: string
  description?: string
  private?: boolean
  isPrivate?: boolean
}

export interface BitbucketRepoContext {
  workspace: string
  owner: string
  repo: string
  host: string
}

export type BitbucketAuthType = 'oauth' | 'app_password'

const BITBUCKET_HOST_PATTERN = /bitbucket\.org/i

export function parseBitbucketRemote(url: string): BitbucketRepoContext | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  const sshMatch = trimmed.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/i)
  if (sshMatch) {
    const host = sshMatch[1]
    if (!BITBUCKET_HOST_PATTERN.test(host)) {
      return null
    }
    const workspace = sshMatch[2]
    const repo = sshMatch[3].replace(/\.git$/i, '')
    return { host, workspace, owner: workspace, repo }
  }

  try {
    const parsed = new URL(trimmed.replace(/\.git$/i, ''))
    if (!BITBUCKET_HOST_PATTERN.test(parsed.hostname)) {
      return null
    }
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    const workspace = parts[0]
    const repo = parts[1]
    return {
      host: parsed.hostname,
      workspace,
      owner: workspace,
      repo
    }
  } catch {
    return null
  }
}

export function slugifyIssueBranch(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function bitbucketMergeMethodToApi(method: BitbucketMergeMethod): string {
  switch (method) {
    case 'squash':
      return 'squash'
    case 'rebase':
      return 'fast_forward'
    default:
      return 'merge_commit'
  }
}

export function normalizeBitbucketPrState(state: string): string {
  const upper = state.toUpperCase()
  if (upper === 'OPEN') return 'open'
  if (upper === 'MERGED' || upper === 'DECLINED' || upper === 'SUPERSEDED') return 'closed'
  return state.toLowerCase()
}

export function normalizeBitbucketIssueState(state: string): string {
  const upper = state.toUpperCase()
  if (upper === 'OPEN' || upper === 'NEW' || upper === 'UNRESOLVED') return 'open'
  if (upper === 'CLOSED' || upper === 'RESOLVED') return 'closed'
  return state.toLowerCase()
}

export type BitbucketIssuesUnavailableReason = 'not_enabled' | 'retired'

const BITBUCKET_ISSUES_UNAVAILABLE_PREFIX = 'BITBUCKET_ISSUES_UNAVAILABLE:'

export function bitbucketIssuesUnavailableMessage(
  reason: BitbucketIssuesUnavailableReason
): string {
  return `${BITBUCKET_ISSUES_UNAVAILABLE_PREFIX}${reason}`
}

export function parseBitbucketIssuesUnavailable(
  error: unknown
): BitbucketIssuesUnavailableReason | null {
  const message = error instanceof Error ? error.message : String(error)
  const coded = message.match(/BITBUCKET_ISSUES_UNAVAILABLE:(not_enabled|retired)/)
  if (coded) {
    return coded[1] as BitbucketIssuesUnavailableReason
  }
  if (/issue tracker is not enabled/i.test(message)) {
    return 'not_enabled'
  }
  if (/no longer available/i.test(message)) {
    return 'retired'
  }
  return null
}
