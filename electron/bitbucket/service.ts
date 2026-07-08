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
import { generateAndUploadSshKey } from './ssh-keys'
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
    bitbucketAuthType: settings.bitbucketAuthType ?? 'oauth'
  }
}

function toStatus(
  login: string,
  avatarUrl: string,
  authType: AppSettings['bitbucketAuthType']
): BitbucketStatus {
  return { connected: true, login, avatarUrl, authType }
}

function disconnectedStatus(): BitbucketStatus {
  return { connected: false, login: null, avatarUrl: null, authType: null }
}

async function clearBitbucketConnection(_settings: AppSettings): Promise<AppSettings> {
  await clearBitbucketToken()
  clearRepoCache()
  return saveSettings({
    bitbucketLogin: '',
    bitbucketAuthLogin: '',
    bitbucketConnectedAt: null,
    bitbucketAuthType: null
  })
}

export async function getBitbucketStatus(settings: AppSettings): Promise<BitbucketStatus> {
  const tokenPresent = await hasBitbucketToken()
  if (!tokenPresent) {
    return disconnectedStatus()
  }

  try {
    const token = await loadBitbucketToken()
    if (!token) return disconnectedStatus()
    const authType = settings.bitbucketAuthType ?? 'oauth'
    const authLogin = resolveBitbucketAuthLogin(settings)
    const user = await getAuthenticatedUser(token, authType, authLogin)
    if (authType === 'oauth' && user.login !== settings.bitbucketLogin) {
      await saveSettings({
        bitbucketLogin: user.login,
        bitbucketConnectedAt: settings.bitbucketConnectedAt ?? Date.now()
      })
    } else if (
      authType === 'app_password' &&
      (user.login !== settings.bitbucketLogin || !settings.bitbucketAuthLogin?.trim())
    ) {
      await saveSettings({
        bitbucketLogin: user.login,
        bitbucketAuthLogin: authLogin ?? settings.bitbucketLogin,
        bitbucketConnectedAt: settings.bitbucketConnectedAt ?? Date.now()
      })
    }
    return toStatus(user.login, user.avatar_url, authType)
  } catch {
    await clearBitbucketConnection(settings)
    return disconnectedStatus()
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
    status: toStatus(user.login, user.avatar_url, authType)
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
  return generateAndUploadSshKey(login, title, authSettings(settings))
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
