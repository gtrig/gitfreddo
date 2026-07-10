import type {
  GitHubCreatePullRequestParams,
  GitHubMergeMethod,
  GitHubPullRequest,
  GitHubPullRequestCommit,
  GitHubPullRequestConversationComment,
  GitHubPullRequestFile,
  GitHubPullRequestFileStatus,
  GitHubPullRequestRepository,
  GitHubPullRequestReview,
  GitHubPullRequestReviewComment,
  GitHubPullRequestReviewCommentParams,
  GitHubPullRequestReviewCommentSide
} from '../../../shared/github'
import { parseGitHubPullHtmlUrl } from '../../../shared/github'
import { githubJson } from './http'

interface GitHubApiPull {
  number: number
  title: string
  state: string
  html_url: string
  user: { login: string }
  head: { ref: string; sha: string }
  base: {
    ref: string
    sha: string
    repo?: {
      name: string
      owner: { login: string }
    }
  }
  body: string
  draft: boolean
  mergeable: boolean | null
}

function mapPullRepository(raw: GitHubApiPull): GitHubPullRequestRepository {
  if (raw.base.repo?.owner.login && raw.base.repo.name) {
    return { owner: raw.base.repo.owner.login, repo: raw.base.repo.name }
  }
  return (
    parseGitHubPullHtmlUrl(raw.html_url) ?? {
      owner: '',
      repo: ''
    }
  )
}

function mapPull(raw: GitHubApiPull): GitHubPullRequest {
  return {
    number: raw.number,
    title: raw.title,
    state: raw.state,
    htmlUrl: raw.html_url,
    repository: mapPullRepository(raw),
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

export async function getPullRequest(
  owner: string,
  repo: string,
  number: number
): Promise<GitHubPullRequest> {
  const raw = await githubJson<GitHubApiPull>(`/repos/${owner}/${repo}/pulls/${number}`)
  return mapPull(raw)
}

interface GitHubApiPullFile {
  filename: string
  status: GitHubPullRequestFileStatus
  additions: number
  deletions: number
  changes: number
}

export async function listPullRequestFiles(
  owner: string,
  repo: string,
  number: number
): Promise<GitHubPullRequestFile[]> {
  const raw = await githubJson<GitHubApiPullFile[]>(
    `/repos/${owner}/${repo}/pulls/${number}/files`
  )
  return raw.map((file) => ({
    path: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes
  }))
}

export async function postPullRequestConversationComment(
  owner: string,
  repo: string,
  number: number,
  body: string
): Promise<void> {
  await githubJson(`/repos/${owner}/${repo}/issues/${number}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body })
  })
}

interface GitHubApiPullCommit {
  sha: string
  commit: {
    message: string
    author: { name: string; email: string; date: string }
  }
  author: { login: string } | null
}

export async function listPullRequestCommits(
  owner: string,
  repo: string,
  number: number
): Promise<GitHubPullRequestCommit[]> {
  const raw = await githubJson<GitHubApiPullCommit[]>(
    `/repos/${owner}/${repo}/pulls/${number}/commits`
  )
  return raw.map((item) => ({
    sha: item.sha,
    subject: item.commit.message.split('\n')[0]?.trim() ?? '',
    message: item.commit.message,
    authorName: item.commit.author.name,
    authorLogin: item.author?.login ?? null,
    committedAt: item.commit.author.date
  }))
}

export async function findPendingPullRequestReviewId(
  owner: string,
  repo: string,
  number: number,
  userLogin: string
): Promise<number | null> {
  const reviews = await listPullRequestReviews(owner, repo, number)
  return reviews.find((review) => review.state === 'PENDING' && review.user === userLogin)?.id ?? null
}

export async function postPullRequestReviewComment(
  owner: string,
  repo: string,
  number: number,
  params: GitHubPullRequestReviewCommentParams,
  pendingReviewId?: number | null
): Promise<void> {
  const payload: Record<string, unknown> = {
    body: params.body,
    commit_id: params.commitId,
    path: params.path,
    line: params.line,
    side: params.side
  }
  if (pendingReviewId != null) {
    payload.pull_request_review_id = pendingReviewId
  }

  await githubJson(`/repos/${owner}/${repo}/pulls/${number}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
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

export async function listPullRequestConversationComments(
  owner: string,
  repo: string,
  number: number
): Promise<GitHubPullRequestConversationComment[]> {
  const raw = await githubJson<
    Array<{
      id: number
      body: string
      user: { login: string }
      created_at: string
      updated_at: string
    }>
  >(`/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`)
  return raw.map((item) => ({
    id: item.id,
    body: item.body,
    user: item.user.login,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  }))
}

export async function listPullRequestReviewComments(
  owner: string,
  repo: string,
  number: number
): Promise<GitHubPullRequestReviewComment[]> {
  const raw = await githubJson<
    Array<{
      id: number
      body: string
      user: { login: string }
      created_at: string
      updated_at: string
      path: string
      line: number | null
      original_line: number | null
      side: GitHubPullRequestReviewCommentSide | null
      commit_id: string
    }>
  >(`/repos/${owner}/${repo}/pulls/${number}/comments?per_page=100`)
  return raw.map((item) => ({
    id: item.id,
    body: item.body,
    user: item.user.login,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    path: item.path,
    line: item.line,
    originalLine: item.original_line,
    side: item.side,
    commitId: item.commit_id
  }))
}

/** @deprecated Use listPullRequestReviewComments */
export async function listComments(
  owner: string,
  repo: string,
  number: number
): Promise<ReturnType<typeof listPullRequestReviewComments>> {
  return listPullRequestReviewComments(owner, repo, number)
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

export async function listPullRequestReviews(
  owner: string,
  repo: string,
  number: number
): Promise<GitHubPullRequestReview[]> {
  const raw = await githubJson<
    Array<{
      id: number
      body: string | null
      user: { login: string }
      state: string
      submitted_at: string
    }>
  >(`/repos/${owner}/${repo}/pulls/${number}/reviews?per_page=100`)
  return raw.map((item) => ({
    id: item.id,
    body: item.body ?? '',
    user: item.user.login,
    state: item.state,
    submittedAt: item.submitted_at
  }))
}

/** @deprecated Use listPullRequestReviews */
export async function listReviews(
  owner: string,
  repo: string,
  number: number
): Promise<ReturnType<typeof listPullRequestReviews>> {
  return listPullRequestReviews(owner, repo, number)
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