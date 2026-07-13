import type { GitlabIssue } from '../../../shared/gitlab'
import { encodeGitlabProjectPath, normalizeGitlabIssueState } from '../../../shared/gitlab'
import { gitlabJson } from './http'
import { projectWebUrl } from './repos'

interface GitlabApiIssue {
  iid: number
  title: string
  state: string
  web_url: string
  author?: { username?: string; name?: string }
  description?: string
  labels?: string[]
}

function mapIssue(
  raw: GitlabApiIssue,
  namespace: string,
  repo: string,
  settingsHost?: string | null
): GitlabIssue {
  return {
    number: raw.iid,
    title: raw.title,
    state: normalizeGitlabIssueState(raw.state),
    htmlUrl: raw.web_url || projectWebUrl(namespace, repo, settingsHost),
    user: raw.author?.username ?? raw.author?.name ?? '',
    body: raw.description ?? '',
    labels: raw.labels ?? []
  }
}

function projectPath(namespace: string, repo: string): string {
  return encodeGitlabProjectPath(namespace, repo)
}

export async function listIssues(
  namespace: string,
  repo: string,
  assigneeLogin?: string,
  settingsHost?: string | null
): Promise<GitlabIssue[]> {
  const params = new URLSearchParams({
    state: 'opened',
    per_page: '100'
  })
  if (assigneeLogin) {
    params.set('assignee_username', assigneeLogin)
  }

  try {
    const raw = await gitlabJson<GitlabApiIssue[]>(
      `/projects/${projectPath(namespace, repo)}/issues?${params}`,
      {},
      undefined,
      settingsHost
    )
    return raw.map((issue) => mapIssue(issue, namespace, repo, settingsHost))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('(404)')) {
      throw new Error('Issues are not enabled for this GitLab project.')
    }
    throw error
  }
}

export async function createIssue(
  namespace: string,
  repo: string,
  params: { title: string; body?: string; labels?: string[] },
  settingsHost?: string | null
): Promise<GitlabIssue> {
  const raw = await gitlabJson<GitlabApiIssue>(
    `/projects/${projectPath(namespace, repo)}/issues`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: params.title,
        description: params.body ?? '',
        labels: params.labels?.join(',') ?? ''
      })
    },
    undefined,
    settingsHost
  )
  return mapIssue(raw, namespace, repo, settingsHost)
}

export async function updateIssue(
  namespace: string,
  repo: string,
  number: number,
  params: { title?: string; body?: string; state?: 'open' | 'closed' },
  settingsHost?: string | null
): Promise<GitlabIssue> {
  const payload: Record<string, unknown> = {}
  if (params.title !== undefined) payload.title = params.title
  if (params.body !== undefined) payload.description = params.body
  if (params.state !== undefined) {
    payload.state_event = params.state === 'closed' ? 'close' : 'reopen'
  }

  const raw = await gitlabJson<GitlabApiIssue>(
    `/projects/${projectPath(namespace, repo)}/issues/${number}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    undefined,
    settingsHost
  )
  return mapIssue(raw, namespace, repo, settingsHost)
}
