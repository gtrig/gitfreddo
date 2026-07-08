import type {
  BitbucketConnectProgress,
  BitbucketCreatePullRequestParams,
  BitbucketCreateRepoParams,
  BitbucketListReposParams,
  BitbucketMergeMethod,
  BitbucketRepo
} from '../../shared/bitbucket'
import type { AppSettings, BitbucketAuthSettings, BitbucketStatus } from '../../shared/ipc'
import { saveSettings } from '../settings'
import { resolveBitbucketAuthLogin } from './auth'
import { inferBitbucketAuthType } from '../../shared/integration-settings'
import { getAuthenticatedUser } from './client'
import { listIssues, createIssue, updateIssue } from './api/issues'
import { createPullRequest, listPullRequests, mergePullRequest } from './api/pulls'
import {
  clearRepoCache,
  createRepo,
  forkRepo,
  listUserRepos,
  listWorkspaces
} from './api/repos'
import { runBitbucketOAuthFlow, type OAuthFlowProgress } from './oauth'
import { resolveBitbucketRepoContext } from './repo-context'
import { generateAndUploadSshKey, findGitFreddoSshKeyTitle } from './ssh-keys'
import {
  clearBitbucketToken,
  hasBitbucketToken,
  loadBitbucketToken,
  saveBitbucketToken
} from './token-store'

function authSettings(settings: AppSettings): BitbucketAuthSettings {
  return {
    bitbucketLogin: settings.bitbucketLogin,
    bitbucketAuthLogin: settings.bitbucketAuthLogin,
    bitbucketAuthType: inferBitbucketAuthType(settings)
  }
}

function sshKeyTitleFromSettings(title: string | undefined | null): string | null {
  const trimmed = title?.trim() ?? ''
  return trimmed || null
}

function toStatus(
  login: string,
  avatarUrl: string,
  authType: AppSettings['bitbucketAuthType'],
  sshKeyTitle: string
): BitbucketStatus {
  return {
    connected: true,
    login,
    avatarUrl,
    authType,
    sshKeyTitle: sshKeyTitleFromSettings(sshKeyTitle)
  }
}

function disconnectedStatus(): BitbucketStatus {
  return { connected: false, login: null, avatarUrl: null, authType: null, sshKeyTitle: null }
}

async function resolveBitbucketSshKeyTitle(
  settings: AppSettings,
  _token: string,
  authType: NonNullable<AppSettings['bitbucketAuthType']>,
  authLogin: string | undefined,
  username: string
): Promise<{ settings: AppSettings; sshKeyTitle: string }> {
  const stored = settings.bitbucketSshKeyTitle?.trim()
  if (stored) {
    return { settings, sshKeyTitle: stored }
  }

  try {
    const discovered = await findGitFreddoSshKeyTitle(username, {
      bitbucketLogin: username,
      bitbucketAuthLogin: authLogin ?? settings.bitbucketAuthLogin,
      bitbucketAuthType: authType
    })
    if (!discovered) {
      return { settings, sshKeyTitle: '' }
    }

    const next = await saveSettings({ bitbucketSshKeyTitle: discovered })
    return { settings: next, sshKeyTitle: discovered }
  } catch {
    // Listing keys can fail without account/ssh scopes. Keep the connection.
    return { settings, sshKeyTitle: '' }
  }
}

async function buildConnectedBitbucketStatus(
  settings: AppSettings,
  token: string,
  authType: NonNullable<AppSettings['bitbucketAuthType']>,
  authLogin: string | undefined,
  user: { login: string; avatar_url: string }
): Promise<{ settings: AppSettings; status: BitbucketStatus }> {
  const sshKey = await resolveBitbucketSshKeyTitle(
    settings,
    token,
    authType,
    authLogin,
    user.login
  )
  return {
    settings: sshKey.settings,
    status: toStatus(user.login, user.avatar_url, authType, sshKey.sshKeyTitle)
  }
}

async function clearBitbucketConnection(_settings: AppSettings): Promise<AppSettings> {
  await clearBitbucketToken()
  clearRepoCache()
  return saveSettings({
    bitbucketLogin: '',
    bitbucketAuthLogin: '',
    bitbucketConnectedAt: null,
    bitbucketAuthType: null,
    bitbucketSshKeyTitle: ''
  })
}

export async function getBitbucketStatus(
  settings: AppSettings
): Promise<{ settings: AppSettings; status: BitbucketStatus }> {
  const tokenPresent = await hasBitbucketToken()
  if (!tokenPresent) {
    return { settings, status: disconnectedStatus() }
  }

  try {
    const token = await loadBitbucketToken()
    if (!token) {
      return { settings, status: disconnectedStatus() }
    }
    const authType = inferBitbucketAuthType(settings)
    const authLogin = resolveBitbucketAuthLogin({ ...settings, bitbucketAuthType: authType })
    const user = await getAuthenticatedUser(token, authType, authLogin)
    if (authType === 'oauth' && user.login !== settings.bitbucketLogin) {
      const updated = await saveSettings({
        bitbucketLogin: user.login,
        bitbucketConnectedAt: settings.bitbucketConnectedAt ?? Date.now()
      })
      return buildConnectedBitbucketStatus(updated, token, authType, authLogin, user)
    }
    if (
      authType === 'app_password' &&
      (user.login !== settings.bitbucketLogin ||
        !settings.bitbucketAuthLogin?.trim() ||
        settings.bitbucketAuthType !== 'app_password')
    ) {
      const updated = await saveSettings({
        bitbucketLogin: user.login,
        bitbucketAuthLogin: authLogin ?? settings.bitbucketLogin,
        bitbucketConnectedAt: settings.bitbucketConnectedAt ?? Date.now(),
        bitbucketAuthType: 'app_password'
      })
      return buildConnectedBitbucketStatus(updated, token, authType, authLogin, user)
    }
    return buildConnectedBitbucketStatus(settings, token, authType, authLogin, user)
  } catch {
    const cleared = await clearBitbucketConnection(settings)
    return { settings: cleared, status: disconnectedStatus() }
  }
}

export async function connectBitbucket(
  onProgress?: (progress: BitbucketConnectProgress) => void
): Promise<{ settings: AppSettings; status: BitbucketStatus }> {
  const mapProgress = (progress: OAuthFlowProgress) =>
    onProgress?.({
      status: progress.status,
      authorizationUri: progress.authorizationUri
    })

  const { token, login } = await runBitbucketOAuthFlow(mapProgress)
  return finalizeBitbucketConnection(token, login, 'oauth')
}

export async function connectBitbucketAppPassword(
  username: string,
  password: string
): Promise<{ settings: AppSettings; status: BitbucketStatus }> {
  const trimmedUsername = username.trim()
  const trimmedPassword = password.trim()
  if (!trimmedUsername || !trimmedPassword) {
    throw new Error('Bitbucket username and app password are required')
  }
  const user = await getAuthenticatedUser(trimmedPassword, 'app_password', trimmedUsername)
  return finalizeBitbucketConnection(
    trimmedPassword,
    user.login,
    'app_password',
    user.avatar_url,
    trimmedUsername
  )
}

async function finalizeBitbucketConnection(
  token: string,
  login: string,
  authType: NonNullable<AppSettings['bitbucketAuthType']>,
  avatarUrl?: string,
  authLogin?: string
): Promise<{ settings: AppSettings; status: BitbucketStatus }> {
  await saveBitbucketToken(token)
  clearRepoCache()

  const user = avatarUrl
    ? { login, avatar_url: avatarUrl }
    : await getAuthenticatedUser(
        token,
        authType,
        authType === 'app_password' ? authLogin : undefined
      )
  const next = await saveSettings({
    bitbucketLogin: user.login,
    bitbucketAuthLogin: authType === 'app_password' ? (authLogin?.trim() || '') : '',
    bitbucketConnectedAt: Date.now(),
    bitbucketAuthType: authType
  })

  return {
    settings: next,
    status: toStatus(user.login, user.avatar_url, authType, next.bitbucketSshKeyTitle)
  }
}

export async function disconnectBitbucket(settings: AppSettings): Promise<AppSettings> {
  return clearBitbucketConnection(settings)
}

export async function listBitbucketRepos(
  settings: AppSettings,
  params?: BitbucketListReposParams
): Promise<BitbucketRepo[]> {
  return listUserRepos(params ?? {}, authSettings(settings))
}

export async function listBitbucketWorkspaces(settings: AppSettings): Promise<string[]> {
  return listWorkspaces(authSettings(settings))
}

export async function createBitbucketRepo(
  settings: AppSettings,
  params: BitbucketCreateRepoParams
): Promise<BitbucketRepo> {
  return createRepo(params, authSettings(settings))
}

export async function forkBitbucketRepo(
  settings: AppSettings,
  workspace: string,
  repo: string
): Promise<BitbucketRepo> {
  return forkRepo(workspace, repo, authSettings(settings))
}

export async function uploadBitbucketSshKey(settings: AppSettings, title: string) {
  const login = settings.bitbucketLogin?.trim()
  if (!login) {
    throw new Error('Bitbucket account is not connected')
  }
  const result = await generateAndUploadSshKey(login, title, authSettings(settings))
  const next = await saveSettings({ bitbucketSshKeyTitle: result.title })
  return { settings: next, result }
}

export async function listBitbucketPullRequests(repoPath: string, settings: AppSettings) {
  const ctx = await resolveBitbucketRepoContext(repoPath, settings)
  return listPullRequests(ctx.workspace, ctx.repo, authSettings(settings))
}

export async function createBitbucketPullRequest(
  repoPath: string,
  settings: AppSettings,
  params: BitbucketCreatePullRequestParams
) {
  const ctx = await resolveBitbucketRepoContext(repoPath, settings)
  return createPullRequest(ctx.workspace, ctx.repo, params, authSettings(settings))
}

export async function mergeBitbucketPullRequest(
  repoPath: string,
  settings: AppSettings,
  number: number,
  method: BitbucketMergeMethod
) {
  const ctx = await resolveBitbucketRepoContext(repoPath, settings)
  await mergePullRequest(ctx.workspace, ctx.repo, number, method, authSettings(settings))
}

export async function listBitbucketIssues(
  repoPath: string,
  settings: AppSettings,
  assigneeLogin?: string
) {
  const ctx = await resolveBitbucketRepoContext(repoPath, settings)
  return listIssues(ctx.workspace, ctx.repo, assigneeLogin, authSettings(settings))
}

export async function createBitbucketIssue(
  repoPath: string,
  settings: AppSettings,
  params: { title: string; body?: string; labels?: string[] }
) {
  const ctx = await resolveBitbucketRepoContext(repoPath, settings)
  return createIssue(ctx.workspace, ctx.repo, params, authSettings(settings))
}

export async function updateBitbucketIssue(
  repoPath: string,
  settings: AppSettings,
  number: number,
  params: { title?: string; body?: string; state?: 'open' | 'closed' }
) {
  const ctx = await resolveBitbucketRepoContext(repoPath, settings)
  return updateIssue(ctx.workspace, ctx.repo, number, params, authSettings(settings))
}

export async function getBitbucketRepoContext(repoPath: string, settings: AppSettings) {
  return resolveBitbucketRepoContext(repoPath, settings)
}

export async function tryGetBitbucketRepoContext(
  repoPath: string,
  settings: AppSettings
): Promise<import('../../shared/bitbucket').BitbucketRepoContext | null> {
  try {
    return await resolveBitbucketRepoContext(repoPath, settings)
  } catch {
    return null
  }
}
