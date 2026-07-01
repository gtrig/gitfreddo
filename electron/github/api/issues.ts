import type { GitHubIssue } from '../../../shared/github'
import { githubJson } from './http'

interface GitHubApiIssue {
  number: number
  title: string
  state: string
  html_url: string
  user: { login: string }
  body: string
  labels: Array<{ name: string }>
  pull_request?: unknown
}

function mapIssue(raw: GitHubApiIssue): GitHubIssue {
  return {
    number: raw.number,
    title: raw.title,
    state: raw.state,
    htmlUrl: raw.html_url,
    user: raw.user.login,
    body: raw.body ?? '',
    labels: raw.labels.map((label) => label.name)
  }
}

export async function listIssues(
  owner: string,
  repo: string,
  assigneeLogin?: string
): Promise<GitHubIssue[]> {
  const params = new URLSearchParams({ state: 'open', per_page: '100' })
  if (assigneeLogin) {
    params.set('assignee', assigneeLogin)
  }
  const raw = await githubJson<GitHubApiIssue[]>(`/repos/${owner}/${repo}/issues?${params}`)
  return raw.filter((item) => !item.pull_request).map(mapIssue)
}

export async function createIssue(
  owner: string,
  repo: string,
  params: { title: string; body?: string; labels?: string[] }
): Promise<GitHubIssue> {
  const raw = await githubJson<GitHubApiIssue>(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: params.title,
      body: params.body ?? '',
      labels: params.labels ?? []
    })
  })
  return mapIssue(raw)
}

export async function updateIssue(
  owner: string,
  repo: string,
  number: number,
  params: { title?: string; body?: string; state?: 'open' | 'closed' }
): Promise<GitHubIssue> {
  const raw = await githubJson<GitHubApiIssue>(`/repos/${owner}/${repo}/issues/${number}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  return mapIssue(raw)
}
