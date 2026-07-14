import type {
  GitlabCreateRepoParams,
  GitlabListReposParams,
  GitlabRepo
} from '../../../shared/gitlab'
import { encodeGitlabProjectPath } from '../../../shared/gitlab'
import { createTtlCache } from '../../forge/repo-cache'
import { getGitlabWebBase } from './http'
import { gitlabJson, gitlabJsonAllPages } from './http'

interface GitlabApiProject {
  id: number
  path_with_namespace: string
  name: string
  namespace: { full_path: string }
  visibility: string
  http_url_to_repo: string
  description: string | null
  default_branch?: string
}

const repoCache = createTtlCache<GitlabRepo[]>(5 * 60 * 1000)

function mapRepo(raw: GitlabApiProject): GitlabRepo {
  const namespace = raw.namespace.full_path
  return {
    id: raw.id,
    fullName: raw.path_with_namespace,
    name: raw.name,
    namespace,
    owner: namespace,
    private: raw.visibility === 'private',
    cloneUrl: raw.http_url_to_repo,
    description: raw.description,
    defaultBranch: raw.default_branch ?? 'main'
  }
}

export function clearRepoCache(): void {
  repoCache.clear()
}

export async function listUserRepos(
  params: GitlabListReposParams = {},
  settingsHost?: string | null
): Promise<GitlabRepo[]> {
  const page = params.page ?? 1
  const search = params.search?.trim().toLowerCase()

  if (!search && page === 1) {
    const cached = repoCache.get()
    if (cached) return cached
  }

  const query = new URLSearchParams({
    membership: 'true',
    per_page: '100',
    page: String(page),
    order_by: 'updated_at',
    sort: 'desc'
  })
  if (search) {
    query.set('search', search)
  }

  const raw = await gitlabJsonAllPages<GitlabApiProject>(
    `/projects?${query}`,
    settingsHost
  )
  let repos = raw.map(mapRepo)

  if (search) {
    repos = repos.filter(
      (repo) =>
        repo.fullName.toLowerCase().includes(search) ||
        repo.name.toLowerCase().includes(search) ||
        repo.namespace.toLowerCase().includes(search) ||
        (repo.description?.toLowerCase().includes(search) ?? false)
    )
  }

  if (!search && page === 1) {
    repoCache.set(repos)
  }

  return repos
}

export async function listNamespaces(settingsHost?: string | null): Promise<string[]> {
  const groups = await gitlabJsonAllPages<{ full_path: string }>(
    '/groups?per_page=100&min_access_level=30',
    settingsHost
  )
  const user = await gitlabJson<{ username: string }>('/user', {}, undefined, settingsHost)
  const namespaces = new Set<string>([user.username, ...groups.map((group) => group.full_path)])
  return [...namespaces].sort()
}

async function resolveNamespaceId(
  namespace: string,
  settingsHost?: string | null
): Promise<number | undefined> {
  const user = await gitlabJson<{ id: number; username: string }>(
    '/user',
    {},
    undefined,
    settingsHost
  )
  if (namespace === user.username) {
    return undefined
  }

  const namespaces = await gitlabJson<Array<{ id: number; full_path: string }>>(
    `/namespaces?search=${encodeURIComponent(namespace)}&per_page=100`,
    {},
    undefined,
    settingsHost
  )
  const match = namespaces.find((entry) => entry.full_path === namespace)
  if (!match) {
    throw new Error(`GitLab namespace "${namespace}" was not found`)
  }
  return match.id
}

export async function createRepo(
  params: GitlabCreateRepoParams,
  settingsHost?: string | null
): Promise<GitlabRepo> {
  const namespace = params.namespace.trim()
  const name = params.name.trim()
  if (!namespace || !name) {
    throw new Error('Namespace and project name are required')
  }

  const namespaceId = await resolveNamespaceId(namespace, settingsHost)
  const payload: Record<string, unknown> = {
    name,
    path: name,
    visibility: params.private ?? params.isPrivate ? 'private' : 'public',
    description: params.description ?? '',
    initialize_with_readme: false
  }
  if (namespaceId !== undefined) {
    payload.namespace_id = namespaceId
  }

  const raw = await gitlabJson<GitlabApiProject>(
    '/projects',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    undefined,
    settingsHost
  )
  clearRepoCache()
  return mapRepo(raw)
}

export async function forkRepo(
  namespace: string,
  repo: string,
  settingsHost?: string | null
): Promise<GitlabRepo> {
  const projectPath = encodeGitlabProjectPath(namespace, repo)
  const raw = await gitlabJson<GitlabApiProject>(
    `/projects/${projectPath}/fork`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    },
    undefined,
    settingsHost
  )
  clearRepoCache()
  return mapRepo(raw)
}

export function projectWebUrl(
  namespace: string,
  repo: string,
  settingsHost?: string | null
): string {
  return `${getGitlabWebBase(settingsHost)}/${namespace}/${repo}`
}
