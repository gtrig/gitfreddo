import type {
  GitHubCreatePullRequestParams,
  GitHubMergeMethod,
  GitHubPullRequest
} from '../../../shared/github'
import { githubJson } from './http'

interface GitHubApiPull {
  number: number
  title: string
  state: string
  html_url: string
  user: { login: string }
  head: { ref: string; sha: string }
  base: { ref: string; sha: string }
  body: string
  draft: boolean
  mergeable: boolean | null
}

function mapPull(raw: GitHubApiPull): GitHubPullRequest {
  return {
    number: raw.number,
    title: raw.title,
    state: raw.state,
    htmlUrl: raw.html_url,
    user: raw.user.login,
    head: { ref: raw.head.ref, sha: raw.head.sha },
    base: { ref: raw.base.ref, sha: raw.base.sha },
    body: raw.body,
    draft: raw.draft,
    mergeable: raw.mergeable
  }
}

export async function listPullRequests(owner: string, repo: string): Promise<GitHubPullRequest[]> {
  const raw = await githubJson<GitHubApiPull[]>(
    `/repos/${owner}/${repo}/pulls?state=open&per_page=100`
  )
  return raw.map(mapPull)
}

export async function createPullRequest(
  owner: string,
  repo: string,
  params: GitHubCreatePullRequestParams
): Promise<GitHubPullRequest> {
  const raw = await githubJson<GitHubApiPull>(`/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: params.title,
      head: params.head,
      base: params.base,
      body: params.body ?? '',
      draft: params.draft ?? false
    })
  })
  return mapPull(raw)
}

export async function mergePullRequest(
  owner: string,
  repo: string,
  number: number,
  method: GitHubMergeMethod
): Promise<void> {
  await githubJson(`/repos/${owner}/${repo}/pulls/${number}/merge`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merge_method: method })
  })
}
