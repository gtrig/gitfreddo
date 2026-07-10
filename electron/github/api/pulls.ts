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

export async function postComment(
  owner: string,
  repo: string,
  number: number,
  body: string
): Promise<void> {
  await githubJson(`/repos/${owner}/${repo}/pulls/${number}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body })
  })
}

export async function listComments(
  owner: string,
  repo: string,
  number: number
): Promise<any[]> {
  const raw = await githubJson<any[]>(
    `/repos/${owner}/${repo}/pulls/${number}/comments`
  )
  return raw
}

export interface UpdatePullRequestParams {
  title?: string
  body?: string
  state?: 'open' | 'closed'
  base?: string
}

export async function updatePullRequest(
  owner: string,
  repo: string,
  number: number,
  params: UpdatePullRequestParams
): Promise<GitHubPullRequest> {
  const body: Record<string, string> = {}
  if (params.title !== undefined) body.title = params.title
  if (params.body !== undefined) body.body = params.body
  if (params.state !== undefined) body.state = params.state
  if (params.base !== undefined) body.base = params.base

  const raw = await githubJson<GitHubApiPull>(
    `/repos/${owner}/${repo}/pulls/${number}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  )
  return mapPull(raw)
}

export interface MergePullRequestOptions {
  commitMessage?: string
  mergeMethod?: GitHubMergeMethod
}

export async function mergePullRequest(
  owner: string,
  repo: string,
  number: number,
  options: MergePullRequestOptions = {}
): Promise<{ sha: string; merged: boolean; message: string }> {
  const body: Record<string, string> = {}
  if (options.commitMessage !== undefined) body.commit_message = options.commitMessage
  if (options.mergeMethod !== undefined) body.merge_method = options.mergeMethod

  const raw = await githubJson<{ sha: string; merged: boolean; message: string }>(
    `/repos/${owner}/${repo}/pulls/${number}/merge`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  )
  return raw
}

export async function closePullRequest(
  owner: string,
  repo: string,
  number: number
): Promise<GitHubPullRequest> {
  const raw = await githubJson<GitHubApiPull>(
    `/repos/${owner}/${repo}/pulls/${number}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'closed' })
    }
  )
  return mapPull(raw)
}

export async function reopenPullRequest(
  owner: string,
  repo: string,
  number: number
): Promise<GitHubPullRequest> {
  const raw = await githubJson<GitHubApiPull>(
    `/repos/${owner}/${repo}/pulls/${number}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'open' })
    }
  )
  return mapPull(raw)
}

export interface RequestReviewParams {
  reviewers?: string[]
  teamReviewers?: string[]
}

export async function requestReview(
  owner: string,
  repo: string,
  number: number,
  params: RequestReviewParams
): Promise<any> {
  const body: Record<string, string[]> = {}
  if (params.reviewers !== undefined) body.reviewers = params.reviewers
  if (params.teamReviewers !== undefined) body.team_reviewers = params.teamReviewers

  return githubJson(
    `/repos/${owner}/${repo}/pulls/${number}/requested_reviewers`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  )
}

export type ReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'

export interface SubmitReviewParams {
  event: ReviewEvent
  body?: string
  commitId?: string
}

export async function submitReview(
  owner: string,
  repo: string,
  number: number,
  params: SubmitReviewParams
): Promise<any> {
  const body: Record<string, string> = { event: params.event }
  if (params.body !== undefined) body.body = params.body
  if (params.commitId !== undefined) body.commit_id = params.commitId

  return githubJson(
    `/repos/${owner}/${repo}/pulls/${number}/reviews`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  )
}

export async function listReviews(
  owner: string,
  repo: string,
  number: number
): Promise<any[]> {
  return githubJson<any[]>(
    `/repos/${owner}/${repo}/pulls/${number}/reviews`
  )
}

export async function dismissReview(
  owner: string,
  repo: string,
  number: number,
  reviewId: number,
  message: string
): Promise<any> {
  return githubJson(
    `/repos/${owner}/${repo}/pulls/${number}/reviews/${reviewId}/dismissals`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    }
  )
}