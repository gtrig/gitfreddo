import type {
  BitbucketCreatePullRequestParams,
  BitbucketMergeMethod,
  BitbucketPullRequest
} from '../../../shared/bitbucket'
import {
  bitbucketMergeMethodToApi,
  normalizeBitbucketPrState
} from '../../../shared/bitbucket'
import type { BitbucketAuthSettings } from '../../../shared/ipc'
import { bitbucketJson } from './http'

interface BitbucketApiPull {
  id: number
  title: string
  state: string
  links: { html?: { href?: string } }
  author?: { display_name?: string; nickname?: string }
  source: { branch: { name: string }; commit?: { hash?: string } }
  destination: { branch: { name: string }; commit?: { hash?: string } }
  summary?: { raw?: string }
  draft?: boolean
  merge_commit?: unknown
}

function mapPull(raw: BitbucketApiPull): BitbucketPullRequest {
  return {
    number: raw.id,
    title: raw.title,
    state: normalizeBitbucketPrState(raw.state),
    htmlUrl: raw.links?.html?.href ?? '',
    user: raw.author?.nickname ?? raw.author?.display_name ?? '',
    head: {
      ref: raw.source.branch.name,
      sha: raw.source.commit?.hash ?? ''
    },
    base: {
      ref: raw.destination.branch.name,
      sha: raw.destination.commit?.hash ?? ''
    },
    body: raw.summary?.raw ?? '',
    draft: Boolean(raw.draft),
    mergeable: raw.state.toUpperCase() === 'OPEN' ? true : null
  }
}

export async function listPullRequests(
  workspace: string,
  repo: string,
  settings?: BitbucketAuthSettings
): Promise<BitbucketPullRequest[]> {
  const raw = await bitbucketJson<{ values?: BitbucketApiPull[] }>(
    `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/pullrequests?state=OPEN&pagelen=100`,
    {},
    undefined,
    settings
  )
  return (raw.values ?? []).map(mapPull)
}

export async function createPullRequest(
  workspace: string,
  repo: string,
  params: BitbucketCreatePullRequestParams,
  settings?: BitbucketAuthSettings
): Promise<BitbucketPullRequest> {
  const raw = await bitbucketJson<BitbucketApiPull>(
    `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/pullrequests`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: params.title,
        source: { branch: { name: params.head } },
        destination: { branch: { name: params.base } },
        summary: { raw: params.body ?? '' },
        close_source_branch: false
      })
    },
    undefined,
    settings
  )
  return mapPull(raw)
}

export async function mergePullRequest(
  workspace: string,
  repo: string,
  number: number,
  method: BitbucketMergeMethod,
  settings?: BitbucketAuthSettings
): Promise<void> {
  await bitbucketJson(
    `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/pullrequests/${number}/merge`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merge_strategy: bitbucketMergeMethodToApi(method),
        close_source_branch: false
      })
    },
    undefined,
    settings
  )
}
