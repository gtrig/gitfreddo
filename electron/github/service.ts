import type {
  GitHubConnectProgress,
  GitHubCreatePullRequestParams,
  GitHubCreateRepoParams,
  GitHubListReposParams,
  GitHubMergeMethod,
  GitHubRepo
} from '../../shared/github'
import type { AppSettings, GitHubStatus } from '../../shared/ipc'
import { saveSettings } from '../settings'
import { getAuthenticatedUser } from './client'
import { listIssues, createIssue, updateIssue } from './api/issues'
import { createPullRequest, listPullRequests, mergePullRequest } from './api/pulls'
import { clearRepoCache, createRepo, forkRepo, listUserRepos } from './api/repos'
import { runGitHubDeviceFlow, type DeviceFlowProgress } from './oauth'
import { resolveGitHubRepoContext } from './repo-context'
import { generateAndUploadSshKey } from './ssh-keys'
import { clearGitHubToken, hasGitHubToken, loadGitHubToken, saveGitHubToken } from './token-store'

function toStatus(login: string, avatarUrl: string): GitHubStatus {
  return { connected: true, login, avatarUrl }
}

function disconnectedStatus(): GitHubStatus {
  return { connected: false, login: null, avatarUrl: null }
}

async function clearGitHubConnection(_settings: AppSettings): Promise<AppSettings> {
  await clearGitHubToken()
  clearRepoCache()
  return saveSettings({
    githubLogin: '',
    githubConnectedAt: null
  })
}

export async function getGitHubStatus(settings: AppSettings): Promise<GitHubStatus> {
  const tokenPresent = await hasGitHubToken()
  if (!tokenPresent) {
    return disconnectedStatus()
  }

  try {
    const token = await loadGitHubToken()
    if (!token) return disconnectedStatus()
    const user = await getAuthenticatedUser(token)
    if (user.login !== settings.githubLogin) {
      await saveSettings({
        githubLogin: user.login,
        githubConnectedAt: settings.githubConnectedAt ?? Date.now()
      })
    }
    return toStatus(user.login, user.avatar_url)
  } catch {
    await clearGitHubConnection(settings)
    return disconnectedStatus()
  }
}

export async function connectGitHub(
  onProgress?: (progress: GitHubConnectProgress) => void
): Promise<{ settings: AppSettings; status: GitHubStatus }> {
  const mapProgress = (progress: DeviceFlowProgress) =>
    onProgress?.({
      userCode: progress.userCode,
      verificationUri: progress.verificationUri
    })

  const { token, login } = await runGitHubDeviceFlow(mapProgress)
  return finalizeGitHubConnection(token, login)
}

export async function connectGitHubPat(
  pat: string
): Promise<{ settings: AppSettings; status: GitHubStatus }> {
  const trimmed = pat.trim()
  if (!trimmed) {
    throw new Error('Personal access token is required')
  }
  const user = await getAuthenticatedUser(trimmed)
  return finalizeGitHubConnection(trimmed, user.login, user.avatar_url)
}

async function finalizeGitHubConnection(
  token: string,
  login: string,
  avatarUrl?: string
): Promise<{ settings: AppSettings; status: GitHubStatus }> {
  await saveGitHubToken(token)
  clearRepoCache()

  const user = avatarUrl ? { login, avatar_url: avatarUrl } : await getAuthenticatedUser(token)
  const next = await saveSettings({
    githubLogin: user.login,
    githubConnectedAt: Date.now()
  })

  return {
    settings: next,
    status: toStatus(user.login, user.avatar_url)
  }
}

export async function disconnectGitHub(settings: AppSettings): Promise<AppSettings> {
  return clearGitHubConnection(settings)
}

export async function listGitHubRepos(params?: GitHubListReposParams): Promise<GitHubRepo[]> {
  return listUserRepos(params ?? {})
}

export async function createGitHubRepo(params: GitHubCreateRepoParams): Promise<GitHubRepo> {
  return createRepo(params)
}

export async function forkGitHubRepo(owner: string, repo: string): Promise<GitHubRepo> {
  return forkRepo(owner, repo)
}

export async function uploadGitHubSshKey(title: string) {
  return generateAndUploadSshKey(title)
}

export async function listGitHubPullRequests(repoPath: string, settings: AppSettings) {
  const ctx = await resolveGitHubRepoContext(repoPath, settings)
  return listPullRequests(ctx.owner, ctx.repo)
}

export async function createGitHubPullRequest(
  repoPath: string,
  settings: AppSettings,
  params: GitHubCreatePullRequestParams
) {
  const ctx = await resolveGitHubRepoContext(repoPath, settings)
  return createPullRequest(ctx.owner, ctx.repo, params)
}

export async function mergeGitHubPullRequest(
  repoPath: string,
  settings: AppSettings,
  number: number,
  method: GitHubMergeMethod
) {
  const ctx = await resolveGitHubRepoContext(repoPath, settings)
  await mergePullRequest(ctx.owner, ctx.repo, number, method)
}

export async function listGitHubIssues(
  repoPath: string,
  settings: AppSettings,
  assigneeLogin?: string
) {
  const ctx = await resolveGitHubRepoContext(repoPath, settings)
  return listIssues(ctx.owner, ctx.repo, assigneeLogin)
}

export async function createGitHubIssue(
  repoPath: string,
  settings: AppSettings,
  params: { title: string; body?: string; labels?: string[] }
) {
  const ctx = await resolveGitHubRepoContext(repoPath, settings)
  return createIssue(ctx.owner, ctx.repo, params)
}

export async function updateGitHubIssue(
  repoPath: string,
  settings: AppSettings,
  number: number,
  params: { title?: string; body?: string; state?: 'open' | 'closed' }
) {
  const ctx = await resolveGitHubRepoContext(repoPath, settings)
  return updateIssue(ctx.owner, ctx.repo, number, params)
}

export async function getGitHubRepoContext(repoPath: string, settings: AppSettings) {
  return resolveGitHubRepoContext(repoPath, settings)
}

export async function tryGetGitHubRepoContext(
  repoPath: string,
  settings: AppSettings
): Promise<import('../../shared/github').GitHubRepoContext | null> {
  try {
    return await resolveGitHubRepoContext(repoPath, settings)
  } catch {
    return null
  }
}
