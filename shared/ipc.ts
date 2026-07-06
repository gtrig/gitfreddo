import type { RepoChangeEvent } from './repo-change'
import type { UpdateEvent } from './update'

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
}

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
  invoke: (method: string, params?: unknown, repoPath?: string) => Promise<unknown>
  pickFile: () => Promise<string | null>
  pickFiles: () => Promise<string[] | null>
  pickGitBinary: () => Promise<string | null>
  deleteWorkspaceFile: (relativePath: string) => Promise<void>
  openInEditor: (relativePath: string) => Promise<void>
  getSettings: () => Promise<AppSettings>
  setSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>
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
  githubCreatePullRequest: (
    repoPath: string,
    params: import('./github').GitHubCreatePullRequestParams
  ) => Promise<import('./github').GitHubPullRequest>
  githubMergePullRequest: (
    repoPath: string,
    number: number,
    method: import('./github').GitHubMergeMethod
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
