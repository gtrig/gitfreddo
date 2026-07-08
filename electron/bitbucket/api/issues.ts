import type { BitbucketIssue } from '../../../shared/bitbucket'
import { normalizeBitbucketIssueState } from '../../../shared/bitbucket'
import type { BitbucketAuthSettings } from '../../../shared/ipc'
import { bitbucketJson } from './http'

interface BitbucketApiIssue {
  id: number
  title: string
  state: string
  links: { html?: { href?: string } }
  reporter?: { display_name?: string; nickname?: string }
  content?: { raw?: string }
  kind?: string
}

function mapIssue(raw: BitbucketApiIssue): BitbucketIssue {
  return {
    number: raw.id,
    title: raw.title,
    state: normalizeBitbucketIssueState(raw.state),
    htmlUrl: raw.links?.html?.href ?? '',
    user: raw.reporter?.nickname ?? raw.reporter?.display_name ?? '',
    body: raw.content?.raw ?? '',
    labels: raw.kind ? [raw.kind] : []
  }
}

export async function listIssues(
  workspace: string,
  repo: string,
  assigneeLogin?: string,
  settings?: BitbucketAuthSettings
): Promise<BitbucketIssue[]> {
  const params = new URLSearchParams({
    pagelen: '100',
    q: 'state="open"'
  })
  if (assigneeLogin) {
    params.set('q', `state="open" AND assignee.username="${assigneeLogin}"`)
  }

  try {
    const raw = await bitbucketJson<{ values?: BitbucketApiIssue[] }>(
      `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/issues?${params}`,
      {},
      undefined,
      settings
    )
    return (raw.values ?? []).map(mapIssue)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('(404)')) {
      throw new Error('Issue tracker is not enabled for this Bitbucket repository.')
    }
    throw error
  }
}

export async function createIssue(
  workspace: string,
  repo: string,
  params: { title: string; body?: string; labels?: string[] },
  settings?: BitbucketAuthSettings
): Promise<BitbucketIssue> {
  const raw = await bitbucketJson<BitbucketApiIssue>(
    `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/issues`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: params.title,
        content: { raw: params.body ?? '' },
        kind: params.labels?.[0] ?? 'bug'
      })
    },
    undefined,
    settings
  )
  return mapIssue(raw)
}

export async function updateIssue(
  workspace: string,
  repo: string,
  number: number,
  params: { title?: string; body?: string; state?: 'open' | 'closed' },
  settings?: BitbucketAuthSettings
): Promise<BitbucketIssue> {
  const payload: Record<string, unknown> = {}
  if (params.title !== undefined) payload.title = params.title
  if (params.body !== undefined) payload.content = { raw: params.body }
  if (params.state !== undefined) {
    payload.state = params.state === 'closed' ? 'resolved' : 'open'
  }

  const raw = await bitbucketJson<BitbucketApiIssue>(
    `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/issues/${number}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    undefined,
    settings
  )
  return mapIssue(raw)
}
