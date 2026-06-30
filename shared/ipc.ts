export interface CliResult {
  stdout: string
  stderr: string
  code: number
}

export type AppTheme = 'dark' | 'freddo'

export function normalizeAppTheme(value: unknown): AppTheme {
  return value === 'freddo' ? 'freddo' : 'dark'
}

export interface AppSettings {
  theme: AppTheme
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
}

export type MenuAction = 'open-workspace' | 'open-settings' | 'refresh' | 'quit'

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

export interface GitFredoAPI {
  openWorkspace: () => Promise<string | null>
  pickDirectory: (defaultPath?: string) => Promise<string | null>
  cloneRepository: (url: string, parentDir: string) => Promise<string>
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
  aiFill: (params: import('./ai').AiFillParams) => Promise<string>
  onMenuAction: (callback: (action: MenuAction) => void) => () => void
  onLogEntry: (callback: (entry: LogEntry) => void) => () => void
}

declare global {
  interface Window {
    gitfredo: GitFredoAPI
  }
}

export {}
