import type {
  BitbucketCreateRepoParams,
  BitbucketListReposParams,
  BitbucketRepo
} from '../../../shared/bitbucket'
import type { BitbucketAuthSettings } from '../../../shared/ipc'
import { createTtlCache } from '../../forge/repo-cache'
import { bitbucketJson, bitbucketJsonAllPages } from './http'

interface BitbucketApiRepo {
  uuid: string
  full_name: string
  name: string
  slug: string
  workspace: { slug: string }
  is_private: boolean
  links: { clone?: Array<{ name: string; href: string }>; html?: { href?: string } }
  description: string | null
  mainbranch?: { name?: string }
}


interface BitbucketApiUserWorkspace {
  workspace: { slug: string }
}

const repoCache = createTtlCache<BitbucketRepo[]>(5 * 60 * 1000)

function mapRepo(raw: BitbucketApiRepo): BitbucketRepo {
  const httpsClone =
    raw.links?.clone?.find((link) => link.name === 'https')?.href ??
    `https://bitbucket.org/${raw.workspace.slug}/${raw.slug}.git`
  return {
    uuid: raw.uuid,
    fullName: raw.full_name,
    name: raw.name,
    workspace: raw.workspace.slug,
    owner: raw.workspace.slug,
    private: raw.is_private,
    cloneUrl: httpsClone,
    description: raw.description,
    defaultBranch: raw.mainbranch?.name ?? 'main'
  }
}

export function clearRepoCache(): void {
  repoCache.clear()
}

async function listWorkspaceSlugs(settings?: BitbucketAuthSettings): Promise<string[]> {
  const workspaces = await bitbucketJsonAllPages<BitbucketApiUserWorkspace>(
    '/user/workspaces?pagelen=100',
    settings
  )
  return [...new Set(workspaces.map((entry) => entry.workspace.slug))].sort()
}

function dedupeRepos(raw: BitbucketApiRepo[]): BitbucketApiRepo[] {
  const seen = new Set<string>()
  return raw.filter((repo) => {
    if (seen.has(repo.uuid)) return false
    seen.add(repo.uuid)
    return true
  })
}

async function listReposForWorkspaces(
  workspaceSlugs: string[],
  settings?: BitbucketAuthSettings
): Promise<BitbucketApiRepo[]> {
  if (!workspaceSlugs.length) return []

  const query = new URLSearchParams({
    role: 'member',
    pagelen: '100',
    sort: '-updated_on'
  })
  const queryString = query.toString()

  const pages = await Promise.all(
    workspaceSlugs.map((workspace) =>
      bitbucketJsonAllPages<BitbucketApiRepo>(
        `/repositories/${encodeURIComponent(workspace)}?${queryString}`,
        settings
      )
    )
  )

  return dedupeRepos(pages.flat())
}

export async function listUserRepos(
  params: BitbucketListReposParams = {},
  settings?: BitbucketAuthSettings
): Promise<BitbucketRepo[]> {
  const page = params.page ?? 1
  const search = params.search?.trim().toLowerCase()

  if (!search && page === 1) {
    const cached = repoCache.get()
    if (cached) return cached
  }

  const workspaceSlugs = await listWorkspaceSlugs(settings)
  const raw = await listReposForWorkspaces(workspaceSlugs, settings)
  let repos = raw.map(mapRepo)

  if (search) {
    repos = repos.filter(
      (repo) =>
        repo.fullName.toLowerCase().includes(search) ||
        repo.name.toLowerCase().includes(search) ||
        repo.workspace.toLowerCase().includes(search) ||
        (repo.description?.toLowerCase().includes(search) ?? false)
    )
  }

  if (!search && page === 1) {
    repoCache.set(repos)
  }

  return repos
}

export async function listWorkspaces(
  settings?: BitbucketAuthSettings
): Promise<string[]> {
  return listWorkspaceSlugs(settings)
}

export async function createRepo(
  params: BitbucketCreateRepoParams,
  settings?: BitbucketAuthSettings
): Promise<BitbucketRepo> {
  const workspace = params.workspace.trim()
  const repoSlug = params.name.trim()
  if (!workspace || !repoSlug) {
    throw new Error('Workspace and repository name are required')
  }

  const raw = await bitbucketJson<BitbucketApiRepo>(
    `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scm: 'git',
        is_private: params.private ?? params.isPrivate ?? false,
        description: params.description ?? ''
      })
    },
    undefined,
    settings
  )
  clearRepoCache()
  return mapRepo(raw)
}

export async function forkRepo(
  workspace: string,
  repo: string,
  settings?: BitbucketAuthSettings
): Promise<BitbucketRepo> {
  const raw = await bitbucketJson<BitbucketApiRepo>(
    `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/forks`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    },
    undefined,
    settings
  )
  clearRepoCache()
  return mapRepo(raw)
}
