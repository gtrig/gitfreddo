import type {
  GitlabConnectProgress,
  GitlabCreateMergeRequestParams,
  GitlabCreateRepoParams,
  GitlabListReposParams,
  GitlabMergeMethod,
  GitlabRepo
} from '../../shared/gitlab'
import type { AppSettings, GitlabStatus } from '../../shared/ipc'
import { saveSettings } from '../settings'
import { isForgeAuthFailure } from '../../shared/forge-auth'
import { getAuthenticatedUser } from './client'
import { listIssues, createIssue, updateIssue } from './api/issues'
import { createMergeRequest, listMergeRequests, mergeMergeRequest } from './api/pulls'
import {
  clearRepoCache,
  createRepo,
  forkRepo,
  listNamespaces,
  listUserRepos
} from './api/repos'
import { runGitlabOAuthFlow, type OAuthFlowProgress } from './oauth'
import { resolveGitlabRepoContext } from './repo-context'
import { generateAndUploadSshKey, findGitFreddoSshKeyTitle } from './ssh-keys'
import {
  clearGitlabToken,
  hasGitlabToken,
  loadGitlabToken,
  saveGitlabToken
} from './token-store'

function settingsHost(settings: AppSettings): string | null {
  return settings.gitlabHost?.trim() || null
}

function sshKeyTitleFromSettings(title: string | undefined | null): string | null {
  const trimmed = title?.trim() ?? ''
  return trimmed || null
}

function toStatus(
  login: string,
  avatarUrl: string,
  authType: AppSettings['gitlabAuthType'],
  sshKeyTitle: string,
  host: string
): GitlabStatus {
  return {
    connected: true,
    login,
    avatarUrl,
    authType,
    sshKeyTitle: sshKeyTitleFromSettings(sshKeyTitle),
    host
  }
}

function disconnectedStatus(host = ''): GitlabStatus {
  return {
    connected: false,
    login: null,
    avatarUrl: null,
    authType: null,
    sshKeyTitle: null,
    host
  }
}

async function resolveGitlabSshKeyTitle(
  settings: AppSettings
): Promise<{ settings: AppSettings; sshKeyTitle: string }> {
  const stored = settings.gitlabSshKeyTitle?.trim()
  if (stored) {
    return { settings, sshKeyTitle: stored }
  }

  try {
    const discovered = await findGitFreddoSshKeyTitle(settingsHost(settings))
    if (!discovered) {
      return { settings, sshKeyTitle: '' }
    }

    const next = await saveSettings({ gitlabSshKeyTitle: discovered })
    return { settings: next, sshKeyTitle: discovered }
  } catch {
    return { settings, sshKeyTitle: '' }
  }
}

async function buildConnectedGitlabStatus(
  settings: AppSettings,
  authType: NonNullable<AppSettings['gitlabAuthType']>,
  user: { login: string; avatar_url: string }
): Promise<{ settings: AppSettings; status: GitlabStatus }> {
  const sshKey = await resolveGitlabSshKeyTitle(settings)
  const host = settingsHost(settings) ?? 'gitlab.com'
  return {
    settings: sshKey.settings,
    status: toStatus(user.login, user.avatar_url, authType, sshKey.sshKeyTitle, host)
  }
}

async function clearGitlabConnection(_settings: AppSettings): Promise<AppSettings> {
  await clearGitlabToken()
  clearRepoCache()
  return saveSettings({
    gitlabLogin: '',
    gitlabConnectedAt: null,
    gitlabAuthType: null,
    gitlabSshKeyTitle: ''
  })
}

export async function getGitlabStatus(
  settings: AppSettings
): Promise<{ settings: AppSettings; status: GitlabStatus }> {
  const host = settingsHost(settings) ?? 'gitlab.com'
  const tokenPresent = await hasGitlabToken()
  if (!tokenPresent) {
    return { settings, status: disconnectedStatus(host) }
  }

  try {
    const token = await loadGitlabToken()
    if (!token) {
      return { settings, status: disconnectedStatus(host) }
    }
    const authType = settings.gitlabAuthType ?? 'oauth'
    const user = await getAuthenticatedUser(token, settingsHost(settings))
    if (user.login !== settings.gitlabLogin) {
      const updated = await saveSettings({
        gitlabLogin: user.login,
        gitlabConnectedAt: settings.gitlabConnectedAt ?? Date.now()
      })
      return buildConnectedGitlabStatus(updated, authType, user)
    }
    return buildConnectedGitlabStatus(settings, authType, user)
  } catch (error) {
    if (!isForgeAuthFailure(error) && settings.gitlabLogin?.trim()) {
      return {
        settings,
        status: toStatus(
          settings.gitlabLogin,
          '',
          settings.gitlabAuthType ?? 'oauth',
          settings.gitlabSshKeyTitle,
          host
        )
      }
    }
    const cleared = await clearGitlabConnection(settings)
    return { settings: cleared, status: disconnectedStatus(host) }
  }
}

export async function connectGitlab(
  onProgress?: (progress: GitlabConnectProgress) => void
): Promise<{ settings: AppSettings; status: GitlabStatus }> {
  const current = await saveSettings({})
  const host = settingsHost(current)
  const mapProgress = (progress: OAuthFlowProgress) =>
    onProgress?.({
      status: progress.status,
      authorizationUri: progress.authorizationUri
    })

  const { token, login } = await runGitlabOAuthFlow(host, mapProgress)
  return finalizeGitlabConnection(token, login, 'oauth', host)
}

export async function connectGitlabPat(
  token: string,
  host?: string
): Promise<{ settings: AppSettings; status: GitlabStatus }> {
  const trimmedToken = token.trim()
  if (!trimmedToken) {
    throw new Error('GitLab personal access token is required')
  }
  const normalizedHost = host?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '') || null
  const user = await getAuthenticatedUser(trimmedToken, normalizedHost)
  return finalizeGitlabConnection(trimmedToken, user.login, 'pat', normalizedHost, user.avatar_url)
}

async function finalizeGitlabConnection(
  token: string,
  login: string,
  authType: NonNullable<AppSettings['gitlabAuthType']>,
  host: string | null,
  avatarUrl?: string
): Promise<{ settings: AppSettings; status: GitlabStatus }> {
  await saveGitlabToken(token)
  clearRepoCache()

  const user = avatarUrl
    ? { login, avatar_url: avatarUrl }
    : await getAuthenticatedUser(token, host)
  const next = await saveSettings({
    gitlabLogin: user.login,
    gitlabConnectedAt: Date.now(),
    gitlabAuthType: authType,
    gitlabHost: host ?? ''
  })

  return {
    settings: next,
    status: toStatus(
      user.login,
      user.avatar_url,
      authType,
      next.gitlabSshKeyTitle,
      host ?? 'gitlab.com'
    )
  }
}

export async function disconnectGitlab(settings: AppSettings): Promise<AppSettings> {
  return clearGitlabConnection(settings)
}

export async function listGitlabRepos(
  settings: AppSettings,
  params?: GitlabListReposParams
): Promise<GitlabRepo[]> {
  return listUserRepos(params ?? {}, settingsHost(settings))
}

export async function listGitlabNamespaces(settings: AppSettings): Promise<string[]> {
  return listNamespaces(settingsHost(settings))
}

export async function createGitlabRepo(
  settings: AppSettings,
  params: GitlabCreateRepoParams
): Promise<GitlabRepo> {
  return createRepo(params, settingsHost(settings))
}

export async function forkGitlabRepo(
  settings: AppSettings,
  namespace: string,
  repo: string
): Promise<GitlabRepo> {
  return forkRepo(namespace, repo, settingsHost(settings))
}

export async function uploadGitlabSshKey(settings: AppSettings, title: string) {
  const login = settings.gitlabLogin?.trim()
  if (!login) {
    throw new Error('GitLab account is not connected')
  }
  const result = await generateAndUploadSshKey(title, settingsHost(settings))
  const next = await saveSettings({ gitlabSshKeyTitle: result.title })
  return { settings: next, result }
}

export async function listGitlabPullRequests(repoPath: string, settings: AppSettings) {
  const ctx = await resolveGitlabRepoContext(repoPath, settings)
  return listMergeRequests(ctx.namespace, ctx.repo, settingsHost(settings))
}

export async function createGitlabPullRequest(
  repoPath: string,
  settings: AppSettings,
  params: GitlabCreateMergeRequestParams
) {
  const ctx = await resolveGitlabRepoContext(repoPath, settings)
  return createMergeRequest(ctx.namespace, ctx.repo, params, settingsHost(settings))
}

export async function mergeGitlabPullRequest(
  repoPath: string,
  settings: AppSettings,
  number: number,
  method: GitlabMergeMethod
) {
  const ctx = await resolveGitlabRepoContext(repoPath, settings)
  await mergeMergeRequest(ctx.namespace, ctx.repo, number, method, settingsHost(settings))
}

export async function listGitlabIssues(
  repoPath: string,
  settings: AppSettings,
  assigneeLogin?: string
) {
  const ctx = await resolveGitlabRepoContext(repoPath, settings)
  return listIssues(ctx.namespace, ctx.repo, assigneeLogin, settingsHost(settings))
}

export async function createGitlabIssue(
  repoPath: string,
  settings: AppSettings,
  params: { title: string; body?: string; labels?: string[] }
) {
  const ctx = await resolveGitlabRepoContext(repoPath, settings)
  return createIssue(ctx.namespace, ctx.repo, params, settingsHost(settings))
}

export async function updateGitlabIssue(
  repoPath: string,
  settings: AppSettings,
  number: number,
  params: { title?: string; body?: string; state?: 'open' | 'closed' }
) {
  const ctx = await resolveGitlabRepoContext(repoPath, settings)
  return updateIssue(ctx.namespace, ctx.repo, number, params, settingsHost(settings))
}

export async function getGitlabRepoContext(repoPath: string, settings: AppSettings) {
  return resolveGitlabRepoContext(repoPath, settings)
}

export async function tryGetGitlabRepoContext(
  repoPath: string,
  settings: AppSettings
): Promise<import('../../shared/gitlab').GitlabRepoContext | null> {
  try {
    return await resolveGitlabRepoContext(repoPath, settings)
  } catch {
    return null
  }
}
