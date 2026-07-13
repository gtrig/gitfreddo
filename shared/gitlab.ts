export interface GitlabRepo {
  id: number
  fullName: string
  name: string
  namespace: string
  owner: string
  private: boolean
  cloneUrl: string
  description: string | null
  defaultBranch: string
}

export interface GitlabMergeRequest {
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

export type GitlabMergeMethod = 'merge' | 'squash' | 'rebase'

export interface GitlabCreateMergeRequestParams {
  title: string
  head: string
  base: string
  body?: string
  draft?: boolean
}

export interface GitlabIssue {
  number: number
  title: string
  state: string
  htmlUrl: string
  user: string
  body: string
  labels: string[]
}

export type GitlabConnectStatus = 'waiting' | 'exchanging' | 'done'

export interface GitlabConnectProgress {
  status: GitlabConnectStatus
  authorizationUri?: string
}

export interface GitlabListReposParams {
  search?: string
  page?: number
}

export interface GitlabCreateRepoParams {
  namespace: string
  name: string
  description?: string
  private?: boolean
  isPrivate?: boolean
}

export interface GitlabRepoContext {
  namespace: string
  owner: string
  repo: string
  host: string
}

export type GitlabAuthType = 'oauth' | 'pat'

const DEFAULT_GITLAB_HOST = 'gitlab.com'

function normalizeHost(host: string): string {
  return host.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
}

export function getDefaultGitlabHost(): string {
  return DEFAULT_GITLAB_HOST
}

export function isGitlabHost(host: string, configuredHost?: string | null): boolean {
  const normalized = normalizeHost(host)
  if (normalized === DEFAULT_GITLAB_HOST || normalized.endsWith('.gitlab.com')) {
    return true
  }
  const custom = configuredHost?.trim()
  if (!custom) return false
  return normalized === normalizeHost(custom)
}

export function parseGitlabRemote(
  url: string,
  configuredHost?: string | null
): GitlabRepoContext | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  const sshMatch = trimmed.match(/^git@([^:]+):(.+?)\/(.+?)(?:\.git)?$/i)
  if (sshMatch) {
    const host = sshMatch[1]
    if (!isGitlabHost(host, configuredHost)) {
      return null
    }
    const namespace = sshMatch[2]
    const repo = sshMatch[3].replace(/\.git$/i, '')
    return { host, namespace, owner: namespace, repo }
  }

  try {
    const parsed = new URL(trimmed.replace(/\.git$/i, ''))
    if (!isGitlabHost(parsed.hostname, configuredHost)) {
      return null
    }
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    const namespace = parts[0]
    const repo = parts[1]
    return {
      host: parsed.hostname,
      namespace,
      owner: namespace,
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

export function gitlabMergeMethodToApi(method: GitlabMergeMethod): {
  mergeCommitMessage?: string
  squashCommitMessage?: string
  squash?: boolean
  shouldRemoveSourceBranch?: boolean
} {
  switch (method) {
    case 'squash':
      return { squash: true }
    case 'rebase':
      return { squash: false }
    default:
      return { squash: false }
  }
}

export function normalizeGitlabMrState(state: string): string {
  const lower = state.toLowerCase()
  if (lower === 'opened' || lower === 'open') return 'open'
  if (lower === 'merged' || lower === 'closed' || lower === 'locked') return 'closed'
  return lower
}

export function normalizeGitlabIssueState(state: string): string {
  const lower = state.toLowerCase()
  if (lower === 'opened' || lower === 'open') return 'open'
  if (lower === 'closed') return 'closed'
  return lower
}

export function encodeGitlabProjectPath(namespace: string, repo: string): string {
  return encodeURIComponent(`${namespace}/${repo}`)
}
