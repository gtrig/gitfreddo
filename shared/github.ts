export interface GitHubRepo {
  id: number
  fullName: string
  name: string
  owner: string
  private: boolean
  cloneUrl: string
  description: string | null
  defaultBranch: string
}

export interface GitHubPullRequest {
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

export type GitHubMergeMethod = 'merge' | 'squash' | 'rebase'

export interface GitHubCreatePullRequestParams {
  title: string
  head: string
  base: string
  body?: string
  draft?: boolean
}

export interface GitHubIssue {
  number: number
  title: string
  state: string
  htmlUrl: string
  user: string
  body: string
  labels: string[]
}

export interface GitHubConnectProgress {
  userCode: string
  verificationUri: string
}

export interface GitHubListReposParams {
  search?: string
  page?: number
}

export interface GitHubCreateRepoParams {
  name: string
  description?: string
  private?: boolean
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

export function slugifyIssueBranch(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
