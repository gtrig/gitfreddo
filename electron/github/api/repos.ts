import type { GitHubCreateRepoParams, GitHubListReposParams, GitHubRepo } from '../../../shared/github'
import { githubJson } from './http'

interface GitHubApiRepo {
  id: number
  full_name: string
  name: string
  owner: { login: string }
  private: boolean
  clone_url: string
  description: string | null
  default_branch: string
}

let cachedRepos: GitHubRepo[] | null = null
let cacheExpiresAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000

function mapRepo(raw: GitHubApiRepo): GitHubRepo {
  return {
    id: raw.id,
    fullName: raw.full_name,
    name: raw.name,
    owner: raw.owner.login,
    private: raw.private,
    cloneUrl: raw.clone_url,
    description: raw.description,
    defaultBranch: raw.default_branch
  }
}

export function clearRepoCache(): void {
  cachedRepos = null
  cacheExpiresAt = 0
}

export async function listUserRepos(params: GitHubListReposParams = {}): Promise<GitHubRepo[]> {
  const page = params.page ?? 1
  const search = params.search?.trim().toLowerCase()

  if (!search && page === 1 && cachedRepos && Date.now() < cacheExpiresAt) {
    return cachedRepos
  }

  const query = new URLSearchParams({
    affiliation: 'owner,collaborator,organization_member',
    per_page: '100',
    page: String(page),
    sort: 'updated'
  })

  const raw = await githubJson<GitHubApiRepo[]>(`/user/repos?${query}`)
  let repos = raw.map(mapRepo)

  if (search) {
    repos = repos.filter(
      (repo) =>
        repo.fullName.toLowerCase().includes(search) ||
        repo.name.toLowerCase().includes(search) ||
        (repo.description?.toLowerCase().includes(search) ?? false)
    )
  }

  if (!search && page === 1) {
    cachedRepos = repos
    cacheExpiresAt = Date.now() + CACHE_TTL_MS
  }

  return repos
}

export async function createRepo(params: GitHubCreateRepoParams): Promise<GitHubRepo> {
  const raw = await githubJson<GitHubApiRepo>('/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.name,
      description: params.description ?? '',
      private: params.private ?? false,
      auto_init: true,
      gitignore_template: params.gitignoreTemplate || undefined,
      license_template: params.licenseTemplate || undefined
    })
  })
  clearRepoCache()
  return mapRepo(raw)
}

export async function forkRepo(owner: string, repo: string): Promise<GitHubRepo> {
  const raw = await githubJson<GitHubApiRepo>(`/repos/${owner}/${repo}/forks`, {
    method: 'POST'
  })
  clearRepoCache()
  return mapRepo(raw)
}
