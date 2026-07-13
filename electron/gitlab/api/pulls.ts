import type {
  GitlabCreateMergeRequestParams,
  GitlabMergeMethod,
  GitlabMergeRequest
} from '../../../shared/gitlab'
import {
  encodeGitlabProjectPath,
  gitlabMergeMethodToApi,
  normalizeGitlabMrState
} from '../../../shared/gitlab'
import { gitlabJson } from './http'
import { projectWebUrl } from './repos'

interface GitlabApiMergeRequest {
  iid: number
  title: string
  state: string
  web_url: string
  author?: { username?: string; name?: string }
  source_branch: string
  target_branch: string
  sha: string
  description?: string
  draft?: boolean
  merge_status?: string
  diff_refs?: { head_sha?: string; base_sha?: string }
}

function mapMergeRequest(
  raw: GitlabApiMergeRequest,
  namespace: string,
  repo: string,
  settingsHost?: string | null
): GitlabMergeRequest {
  return {
    number: raw.iid,
    title: raw.title,
    state: normalizeGitlabMrState(raw.state),
    htmlUrl: raw.web_url || projectWebUrl(namespace, repo, settingsHost),
    user: raw.author?.username ?? raw.author?.name ?? '',
    head: {
      ref: raw.source_branch,
      sha: raw.diff_refs?.head_sha ?? raw.sha ?? ''
    },
    base: {
      ref: raw.target_branch,
      sha: raw.diff_refs?.base_sha ?? ''
    },
    body: raw.description ?? '',
    draft: Boolean(raw.draft),
    mergeable: raw.merge_status === 'can_be_merged' ? true : raw.merge_status ? false : null
  }
}

function projectPath(namespace: string, repo: string): string {
  return encodeGitlabProjectPath(namespace, repo)
}

export async function listMergeRequests(
  namespace: string,
  repo: string,
  settingsHost?: string | null
): Promise<GitlabMergeRequest[]> {
  const raw = await gitlabJson<GitlabApiMergeRequest[]>(
    `/projects/${projectPath(namespace, repo)}/merge_requests?state=opened&per_page=100`,
    {},
    undefined,
    settingsHost
  )
  return raw.map((mr) => mapMergeRequest(mr, namespace, repo, settingsHost))
}

export async function createMergeRequest(
  namespace: string,
  repo: string,
  params: GitlabCreateMergeRequestParams,
  settingsHost?: string | null
): Promise<GitlabMergeRequest> {
  const raw = await gitlabJson<GitlabApiMergeRequest>(
    `/projects/${projectPath(namespace, repo)}/merge_requests`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: params.title,
        source_branch: params.head,
        target_branch: params.base,
        description: params.body ?? '',
        draft: params.draft ?? false,
        remove_source_branch: false
      })
    },
    undefined,
    settingsHost
  )
  return mapMergeRequest(raw, namespace, repo, settingsHost)
}

export async function mergeMergeRequest(
  namespace: string,
  repo: string,
  number: number,
  method: GitlabMergeMethod,
  settingsHost?: string | null
): Promise<void> {
  const mergeParams = gitlabMergeMethodToApi(method)
  await gitlabJson(
    `/projects/${projectPath(namespace, repo)}/merge_requests/${number}/merge`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        squash: mergeParams.squash ?? false,
        merge_when_pipeline_succeeds: false,
        should_remove_source_branch: false
      })
    },
    undefined,
    settingsHost
  )
}
