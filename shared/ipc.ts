import type { RepoChangeEvent } from './repo-change'
import type { UpdateEvent } from './update'
import type { GitIpcMethod, GitIpcParams, GitIpcResult } from './git/ipc'

export type { UpdateEvent, UpdateChannel, UpdateUiState, UpdateUiStatus } from './update'
import type { UpdateChannel } from './update'

export type { RepoChangeEvent, RepoChangeScope } from './repo-change'
export {
  REPO_CHANGE_REFS_QUERY_SUFFIXES,
  REPO_CHANGE_WORKING_QUERY_SUFFIXES
} from './repo-change'

export interface CliResult {
  stdout: string
  stderr: string
  code: number
}

import type { AppTheme } from './themes'

export type { AppTheme }
export { normalizeAppTheme } from './themes'

export type AppLocale = 'en' | 'el'

export type SubmoduleRecursion = 'none' | 'on-demand' | 'always'
export type PushSubmoduleRecursion = 'no' | 'check' | 'on-demand'

export interface AppSettings {
  theme: AppTheme
  locale: AppLocale
  gitBinaryPath: string
  recentRepos: string[]
  openRepoTabs: string[]
  activeRepoTab: string | null
  pollIntervalMs: number
  defaultRemote: string
  editorCommand: string
  logMaxCount: number
  aiEnabled: boolean
  aiProvider: 'local' | 'api'
  aiBaseUrl: string
  aiApiKey: string
  aiModel: string
  aiSystemInstructions: string
  aiCommitInstructions: string
  aiStashInstructions: string
  aiConflictInstructions: string
  githubLogin: string
  githubConnectedAt: number | null
  githubSshKeyTitle: string
  bitbucketLogin: string
  bitbucketAuthLogin: string
  bitbucketConnectedAt: number | null
  bitbucketAuthType: import('./bitbucket').BitbucketAuthType | null
  bitbucketSshKeyTitle: string
  pullRebase: boolean
  submoduleRecursion: SubmoduleRecursion
  pushSubmoduleRecursion: PushSubmoduleRecursion
  diffViewMode: 'unified' | 'split' | 'word'
  uiZoomFactor: number
  updateChannel: UpdateChannel
  autoDownloadUpdates: boolean
  checkForUpdatesOnStartup: boolean
}

export interface GitHubStatus {
  connected: boolean
  login: string | null
  avatarUrl: string | null
  sshKeyTitle: string | null
}

export interface BitbucketStatus {
  connected: boolean
  login: string | null
  avatarUrl: string | null
  authType: import('./bitbucket').BitbucketAuthType | null
  sshKeyTitle: string | null
}

export type BitbucketAuthSettings = Pick<
  AppSettings,
  'bitbucketLogin' | 'bitbucketAuthLogin' | 'bitbucketAuthType'
>

export type MenuAction =
  | 'open-workspace'
  | 'open-settings'
  | 'open-docs'
  | 'refresh'
  | 'undo'
  | 'check-for-updates'
  | 'quit'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'
export type LogStream = 'git' | 'app'

export interface LogEntry {
  id: string
  stream: LogStream
  level: LogLevel
  timestamp: number
  message: string
  details?: string
}

export interface GitFreddoAPI {
  openWorkspace: () => Promise<string | null>
  pickDirectory: (defaultPath?: string) => Promise<string | null>
  cloneRepository: (url: string, parentDir: string) => Promise<string>
  initRepository: () => Promise<string | null>
  normalizeRepoPath: (repoPath: string) => Promise<string>
  getRecentRepos: () => Promise<string[]>
  connect: (repoPath: string) => Promise<string>
  switchWorkspace: (repoPath: string) => Promise<string>
  disconnectWorkspace: (repoPath: string) => Promise<void>
  listWorkspaces: () => Promise<string[]>
  getWorkspacePath: () => Promise<string | null>
  disconnect: () => Promise<void>
  invoke: {
    <M extends GitIpcMethod>(
      method: M,
      params?: GitIpcParams<M>,
      repoPath?: string
    ): Promise<GitIpcResult<M>>
    (method: string, params?: unknown, repoPath?: string): Promise<unknown>
  }
  pickFile: () => Promise<string | null>
  pickFiles: () => Promise<string[] | null>
  pickGitBinary: () => Promise<string | null>
  deleteWorkspaceFile: (relativePath: string) => Promise<void>
  openInEditor: (relativePath: string) => Promise<void>
  getSettings: () => Promise<AppSettings>
  setSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>
  exportSettingsBackup: () => Promise<string | null>
  importSettingsBackup: () => Promise<AppSettings | null>
  githubGetStatus: () => Promise<GitHubStatus>
  githubConnect: () => Promise<GitHubStatus>
  githubConnectPat: (token: string) => Promise<GitHubStatus>
  githubDisconnect: () => Promise<void>
  githubListRepos: (params?: import('./github').GitHubListReposParams) => Promise<import('./github').GitHubRepo[]>
  githubCreateRepo: (params: import('./github').GitHubCreateRepoParams) => Promise<import('./github').GitHubRepo>
  githubForkRepo: (owner: string, repo: string) => Promise<import('./github').GitHubRepo>
  githubUploadSshKey: (title: string) => Promise<{ title: string; publicKey: string }>
  githubGetRepoContext: (repoPath: string) => Promise<import('./github').GitHubRepoContext | null>
  githubListPullRequests: (repoPath: string) => Promise<import('./github').GitHubPullRequest[]>
  githubGetPullRequest: (
    repoPath: string,
    number: number,
    repository?: import('./github').GitHubPullRequestRepository
  ) => Promise<import('./github').GitHubPullRequest>
  githubListPullRequestFiles: (
    repoPath: string,
    number: number,
    repository?: import('./github').GitHubPullRequestRepository
  ) => Promise<import('./github').GitHubPullRequestFile[]>
  githubListPullRequestCommits: (
    repoPath: string,
    number: number,
    repository?: import('./github').GitHubPullRequestRepository
  ) => Promise<import('./github').GitHubPullRequestCommit[]>
  githubListPullRequestConversationComments: (
    repoPath: string,
    number: number,
    repository?: import('./github').GitHubPullRequestRepository
  ) => Promise<import('./github').GitHubPullRequestConversationComment[]>
  githubListPullRequestReviewComments: (
    repoPath: string,
    number: number,
    repository?: import('./github').GitHubPullRequestRepository
  ) => Promise<import('./github').GitHubPullRequestReviewComment[]>
  githubListPullRequestReviews: (
    repoPath: string,
    number: number,
    repository?: import('./github').GitHubPullRequestRepository
  ) => Promise<import('./github').GitHubPullRequestReview[]>
  githubCreatePullRequest: (
    repoPath: string,
    params: import('./github').GitHubCreatePullRequestParams
  ) => Promise<import('./github').GitHubPullRequest>
  githubMergePullRequest: (
    repoPath: string,
    number: number,
    method: import('./github').GitHubMergeMethod
  ) => Promise<void>
  githubReopenPullRequest: (
    repoPath: string,
    number: number
  ) => Promise<import('./github').GitHubPullRequest>
  githubPostPullRequestComment: (
    repoPath: string,
    number: number,
    body: string,
    repository?: import('./github').GitHubPullRequestRepository
  ) => Promise<void>
  githubPostPullRequestReviewComment: (
    repoPath: string,
    number: number,
    params: import('./github').GitHubPullRequestReviewCommentParams,
    repository?: import('./github').GitHubPullRequestRepository
  ) => Promise<void>
  githubListIssues: (repoPath: string, assigneeLogin?: string) => Promise<import('./github').GitHubIssue[]>
  githubCreateIssue: (
    repoPath: string,
    params: { title: string; body?: string; labels?: string[] }
  ) => Promise<import('./github').GitHubIssue>
  githubUpdateIssue: (
    repoPath: string,
    number: number,
    params: { title?: string; body?: string; state?: 'open' | 'closed' }
  ) => Promise<import('./github').GitHubIssue>
  aiFill: (params: import('./ai').AiFillParams) => Promise<string>
  onGitHubConnectProgress: (
    callback: (progress: import('./github').GitHubConnectProgress) => void
  ) => () => void
  bitbucketGetStatus: () => Promise<BitbucketStatus>
  bitbucketConnect: () => Promise<BitbucketStatus>
  bitbucketConnectAppPassword: (username: string, password: string) => Promise<BitbucketStatus>
  bitbucketDisconnect: () => Promise<void>
  bitbucketListRepos: (
    params?: import('./bitbucket').BitbucketListReposParams
  ) => Promise<import('./bitbucket').BitbucketRepo[]>
  bitbucketListWorkspaces: () => Promise<string[]>
  bitbucketCreateRepo: (
    params: import('./bitbucket').BitbucketCreateRepoParams
  ) => Promise<import('./bitbucket').BitbucketRepo>
  bitbucketForkRepo: (workspace: string, repo: string) => Promise<import('./bitbucket').BitbucketRepo>
  bitbucketUploadSshKey: (title: string) => Promise<{ title: string; publicKey: string }>
  bitbucketGetRepoContext: (
    repoPath: string
  ) => Promise<import('./bitbucket').BitbucketRepoContext | null>
  bitbucketListPullRequests: (
    repoPath: string
  ) => Promise<import('./bitbucket').BitbucketPullRequest[]>
  bitbucketCreatePullRequest: (
    repoPath: string,
    params: import('./bitbucket').BitbucketCreatePullRequestParams
  ) => Promise<import('./bitbucket').BitbucketPullRequest>
  bitbucketMergePullRequest: (
    repoPath: string,
    number: number,
    method: import('./bitbucket').BitbucketMergeMethod
  ) => Promise<void>
  bitbucketListIssues: (
    repoPath: string,
    assigneeLogin?: string
  ) => Promise<import('./bitbucket').BitbucketIssue[]>
  bitbucketCreateIssue: (
    repoPath: string,
    params: { title: string; body?: string; labels?: string[] }
  ) => Promise<import('./bitbucket').BitbucketIssue>
  bitbucketUpdateIssue: (
    repoPath: string,
    number: number,
    params: { title?: string; body?: string; state?: 'open' | 'closed' }
  ) => Promise<import('./bitbucket').BitbucketIssue>
  onBitbucketConnectProgress: (
    callback: (progress: import('./bitbucket').BitbucketConnectProgress) => void
  ) => () => void
  onMenuAction: (callback: (action: MenuAction) => void) => () => void
  onLogEntry: (callback: (entry: LogEntry) => void) => () => void
  getZoomFactor: () => Promise<number>
  zoomIn: () => Promise<number>
  zoomOut: () => Promise<number>
  onZoomChanged: (callback: (factor: number) => void) => () => void
  onRepoChanged: (callback: (event: RepoChangeEvent) => void) => () => void
  getAppVersion: () => Promise<string>
  checkForUpdates: () => Promise<void>
  downloadUpdate: () => Promise<void>
  installUpdate: () => void
  onUpdateEvent: (callback: (event: UpdateEvent) => void) => () => void
}

declare global {
  interface Window {
    gitfreddo: GitFreddoAPI
  }
}

export {}
