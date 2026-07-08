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
import { isForgeAuthFailure } from '../../shared/forge-auth'
import { getAuthenticatedUser } from './client'
import { listIssues, createIssue, updateIssue } from './api/issues'
import { createPullRequest, listPullRequests, mergePullRequest } from './api/pulls'
import { clearRepoCache, createRepo, forkRepo, listUserRepos } from './api/repos'
import { runGitHubDeviceFlow, type DeviceFlowProgress } from './oauth'
import { resolveGitHubRepoContext } from './repo-context'
import { generateAndUploadSshKey, findGitFreddoSshKeyTitle } from './ssh-keys'
import { clearGitHubToken, hasGitHubToken, loadGitHubToken, saveGitHubToken } from './token-store'

function sshKeyTitleFromSettings(title: string | undefined | null): string | null {
  const trimmed = title?.trim() ?? ''
  return trimmed || null
}

function toStatus(login: string, avatarUrl: string, sshKeyTitle: string): GitHubStatus {
  return {
    connected: true,
    login,
    avatarUrl,
    sshKeyTitle: sshKeyTitleFromSettings(sshKeyTitle)
  }
}

function disconnectedStatus(): GitHubStatus {
  return { connected: false, login: null, avatarUrl: null, sshKeyTitle: null }
}

async function clearGitHubConnection(_settings: AppSettings): Promise<AppSettings> {
  await clearGitHubToken()
  clearRepoCache()
  return saveSettings({
    githubLogin: '',
    githubConnectedAt: null,
    githubSshKeyTitle: ''
  })
}

async function resolveGitHubSshKeyTitle(
  settings: AppSettings,
  token: string
): Promise<{ settings: AppSettings; sshKeyTitle: string }> {
  const stored = settings.githubSshKeyTitle?.trim()
  if (stored) {
    return { settings, sshKeyTitle: stored }
  }

  try {
    const discovered = await findGitFreddoSshKeyTitle(token)
    if (!discovered) {
      return { settings, sshKeyTitle: '' }
    }

    const next = await saveSettings({ githubSshKeyTitle: discovered })
    return { settings: next, sshKeyTitle: discovered }
  } catch {
    // Listing keys can fail for valid tokens that lack admin:public_key.
    // Keep the authenticated connection and leave SSH status unknown.
    return { settings, sshKeyTitle: '' }
  }
}

export async function getGitHubStatus(
  settings: AppSettings
): Promise<{ settings: AppSettings; status: GitHubStatus }> {
  const tokenPresent = await hasGitHubToken()
  if (!tokenPresent) {
    return { settings, status: disconnectedStatus() }
  }

  try {
    const token = await loadGitHubToken()
    if (!token) {
      return { settings, status: disconnectedStatus() }
    }
    const user = await getAuthenticatedUser(token)
    let nextSettings = settings
    if (user.login !== settings.githubLogin) {
      nextSettings = await saveSettings({
        githubLogin: user.login,
        githubConnectedAt: settings.githubConnectedAt ?? Date.now()
      })
    }
    const sshKey = await resolveGitHubSshKeyTitle(nextSettings, token)
    return {
      settings: sshKey.settings,
      status: toStatus(user.login, user.avatar_url, sshKey.sshKeyTitle)
    }
  } catch (error) {
    if (!isForgeAuthFailure(error) && settings.githubLogin?.trim()) {
      return {
        settings,
        status: toStatus(settings.githubLogin, '', settings.githubSshKeyTitle)
      }
    }
    const cleared = await clearGitHubConnection(settings)
    return { settings: cleared, status: disconnectedStatus() }
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
    status: toStatus(user.login, user.avatar_url, next.githubSshKeyTitle)
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

export async function uploadGitHubSshKey(_settings: AppSettings, title: string) {
  const result = await generateAndUploadSshKey(title)
  const next = await saveSettings({ githubSshKeyTitle: result.title })
  return { settings: next, result }
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
