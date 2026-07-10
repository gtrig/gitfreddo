import { contextBridge, ipcRenderer } from 'electron'
import type { AiFillParams } from '../../shared/ai'
import type { AppSettings, GitFreddoAPI, LogEntry, MenuAction, RepoChangeEvent, UpdateEvent } from '../../shared/ipc'

const api: GitFreddoAPI = {
  openWorkspace: () => ipcRenderer.invoke('gitfreddo:open-workspace'),
  pickDirectory: (defaultPath) => ipcRenderer.invoke('gitfreddo:pick-directory', defaultPath),
  cloneRepository: (url, parentDir) =>
    ipcRenderer.invoke('gitfreddo:clone-repository', url, parentDir),
  initRepository: () => ipcRenderer.invoke('gitfreddo:init-repository'),
  normalizeRepoPath: (repoPath) => ipcRenderer.invoke('gitfreddo:normalize-repo-path', repoPath),
  getRecentRepos: () => ipcRenderer.invoke('gitfreddo:get-recent-repos'),
  getWorkspacePath: () => ipcRenderer.invoke('gitfreddo:get-workspace-path'),
  connect: (repoPath) => ipcRenderer.invoke('gitfreddo:connect', repoPath),
  switchWorkspace: (repoPath) => ipcRenderer.invoke('gitfreddo:switch-workspace', repoPath),
  disconnectWorkspace: (repoPath) => ipcRenderer.invoke('gitfreddo:disconnect-workspace', repoPath),
  listWorkspaces: () => ipcRenderer.invoke('gitfreddo:list-workspaces'),
  disconnect: () => ipcRenderer.invoke('gitfreddo:disconnect'),
  invoke: ((method: string, params?: unknown, repoPath?: string) =>
    ipcRenderer.invoke('gitfreddo:invoke', method, params, repoPath)) as GitFreddoAPI['invoke'],
  pickFile: () => ipcRenderer.invoke('gitfreddo:pick-file'),
  pickFiles: () => ipcRenderer.invoke('gitfreddo:pick-files'),
  pickGitBinary: () => ipcRenderer.invoke('gitfreddo:pick-git-binary'),
  deleteWorkspaceFile: (relativePath) =>
    ipcRenderer.invoke('gitfreddo:delete-workspace-file', relativePath),
  openInEditor: (relativePath) => ipcRenderer.invoke('gitfreddo:open-in-editor', relativePath),
  getSettings: () => ipcRenderer.invoke('gitfreddo:get-settings'),
  setSettings: (patch) => ipcRenderer.invoke('gitfreddo:set-settings', patch),
  exportSettingsBackup: () => ipcRenderer.invoke('gitfreddo:export-settings-backup'),
  importSettingsBackup: () => ipcRenderer.invoke('gitfreddo:import-settings-backup'),
  githubGetStatus: () => ipcRenderer.invoke('gitfreddo:github-get-status'),
  githubConnect: () => ipcRenderer.invoke('gitfreddo:github-connect'),
  githubConnectPat: (token) => ipcRenderer.invoke('gitfreddo:github-connect-pat', token),
  githubDisconnect: () => ipcRenderer.invoke('gitfreddo:github-disconnect'),
  githubListRepos: (params) => ipcRenderer.invoke('gitfreddo:github-list-repos', params),
  githubCreateRepo: (params) => ipcRenderer.invoke('gitfreddo:github-create-repo', params),
  githubForkRepo: (owner, repo) => ipcRenderer.invoke('gitfreddo:github-fork-repo', owner, repo),
  githubUploadSshKey: (title) => ipcRenderer.invoke('gitfreddo:github-upload-ssh-key', title),
  githubGetRepoContext: (repoPath) =>
    ipcRenderer.invoke('gitfreddo:github-get-repo-context', repoPath),
  githubListPullRequests: (repoPath) =>
    ipcRenderer.invoke('gitfreddo:github-list-pull-requests', repoPath),
  githubGetPullRequest: (repoPath, number, repository) =>
    ipcRenderer.invoke('gitfreddo:github-get-pull-request', repoPath, number, repository),
  githubListPullRequestFiles: (repoPath, number, repository) =>
    ipcRenderer.invoke('gitfreddo:github-list-pull-request-files', repoPath, number, repository),
  githubListPullRequestCommits: (repoPath, number, repository) =>
    ipcRenderer.invoke('gitfreddo:github-list-pull-request-commits', repoPath, number, repository),
  githubListPullRequestConversationComments: (repoPath, number, repository) =>
    ipcRenderer.invoke(
      'gitfreddo:github-list-pull-request-conversation-comments',
      repoPath,
      number,
      repository
    ),
  githubListPullRequestReviewComments: (repoPath, number, repository) =>
    ipcRenderer.invoke(
      'gitfreddo:github-list-pull-request-review-comments',
      repoPath,
      number,
      repository
    ),
  githubListPullRequestReviews: (repoPath, number, repository) =>
    ipcRenderer.invoke('gitfreddo:github-list-pull-request-reviews', repoPath, number, repository),
  githubCreatePullRequest: (repoPath, params) =>
    ipcRenderer.invoke('gitfreddo:github-create-pull-request', repoPath, params),
  githubMergePullRequest: (repoPath, number, method) =>
    ipcRenderer.invoke('gitfreddo:github-merge-pull-request', repoPath, number, method),
  githubReopenPullRequest: (repoPath, number) =>
    ipcRenderer.invoke('gitfreddo:github-reopen-pull-request', repoPath, number),
  githubPostPullRequestComment: (repoPath, number, body, repository) =>
    ipcRenderer.invoke('gitfreddo:github-post-pull-request-comment', repoPath, number, body, repository),
  githubPostPullRequestReviewComment: (repoPath, number, params, repository) =>
    ipcRenderer.invoke(
      'gitfreddo:github-post-pull-request-review-comment',
      repoPath,
      number,
      params,
      repository
    ),
  githubListIssues: (repoPath, assigneeLogin) =>
    ipcRenderer.invoke('gitfreddo:github-list-issues', repoPath, assigneeLogin),
  githubCreateIssue: (repoPath, params) =>
    ipcRenderer.invoke('gitfreddo:github-create-issue', repoPath, params),
  githubUpdateIssue: (repoPath, number, params) =>
    ipcRenderer.invoke('gitfreddo:github-update-issue', repoPath, number, params),
  aiFill: (params: AiFillParams) => ipcRenderer.invoke('gitfreddo:ai-fill', params),
  onMenuAction: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, action: MenuAction) => callback(action)
    ipcRenderer.on('app:menu', listener)
    return () => ipcRenderer.removeListener('app:menu', listener)
  },
  onLogEntry: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, entry: LogEntry) => callback(entry)
    ipcRenderer.on('gitfreddo:log-entry', listener)
    return () => ipcRenderer.removeListener('gitfreddo:log-entry', listener)
  },
  getZoomFactor: () => ipcRenderer.invoke('gitfreddo:get-zoom-factor'),
  zoomIn: () => ipcRenderer.invoke('gitfreddo:zoom-in'),
  zoomOut: () => ipcRenderer.invoke('gitfreddo:zoom-out'),
  onZoomChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, factor: number) => callback(factor)
    ipcRenderer.on('gitfreddo:zoom-changed', listener)
    return () => ipcRenderer.removeListener('gitfreddo:zoom-changed', listener)
  },
  onRepoChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: RepoChangeEvent) =>
      callback(payload)
    ipcRenderer.on('gitfreddo:repo-changed', listener)
    return () => ipcRenderer.removeListener('gitfreddo:repo-changed', listener)
  },
  getAppVersion: () => ipcRenderer.invoke('gitfreddo:get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('gitfreddo:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('gitfreddo:download-update'),
  installUpdate: () => {
    ipcRenderer.invoke('gitfreddo:install-update')
  },
  onUpdateEvent: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: UpdateEvent) => callback(payload)
    ipcRenderer.on('gitfreddo:update-event', listener)
    return () => ipcRenderer.removeListener('gitfreddo:update-event', listener)
  },
  onGitHubConnectProgress: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      progress: import('../../shared/github').GitHubConnectProgress
    ) => callback(progress)
    ipcRenderer.on('gitfreddo:github-connect-progress', listener)
    return () => ipcRenderer.removeListener('gitfreddo:github-connect-progress', listener)
  },
  bitbucketGetStatus: () => ipcRenderer.invoke('gitfreddo:bitbucket-get-status'),
  bitbucketConnect: () => ipcRenderer.invoke('gitfreddo:bitbucket-connect'),
  bitbucketConnectAppPassword: (username, password) =>
    ipcRenderer.invoke('gitfreddo:bitbucket-connect-app-password', username, password),
  bitbucketDisconnect: () => ipcRenderer.invoke('gitfreddo:bitbucket-disconnect'),
  bitbucketListRepos: (params) => ipcRenderer.invoke('gitfreddo:bitbucket-list-repos', params),
  bitbucketListWorkspaces: () => ipcRenderer.invoke('gitfreddo:bitbucket-list-workspaces'),
  bitbucketCreateRepo: (params) => ipcRenderer.invoke('gitfreddo:bitbucket-create-repo', params),
  bitbucketForkRepo: (workspace, repo) =>
    ipcRenderer.invoke('gitfreddo:bitbucket-fork-repo', workspace, repo),
  bitbucketUploadSshKey: (title) => ipcRenderer.invoke('gitfreddo:bitbucket-upload-ssh-key', title),
  bitbucketGetRepoContext: (repoPath) =>
    ipcRenderer.invoke('gitfreddo:bitbucket-get-repo-context', repoPath),
  bitbucketListPullRequests: (repoPath) =>
    ipcRenderer.invoke('gitfreddo:bitbucket-list-pull-requests', repoPath),
  bitbucketCreatePullRequest: (repoPath, params) =>
    ipcRenderer.invoke('gitfreddo:bitbucket-create-pull-request', repoPath, params),
  bitbucketMergePullRequest: (repoPath, number, method) =>
    ipcRenderer.invoke('gitfreddo:bitbucket-merge-pull-request', repoPath, number, method),
  bitbucketListIssues: (repoPath, assigneeLogin) =>
    ipcRenderer.invoke('gitfreddo:bitbucket-list-issues', repoPath, assigneeLogin),
  bitbucketCreateIssue: (repoPath, params) =>
    ipcRenderer.invoke('gitfreddo:bitbucket-create-issue', repoPath, params),
  bitbucketUpdateIssue: (repoPath, number, params) =>
    ipcRenderer.invoke('gitfreddo:bitbucket-update-issue', repoPath, number, params),
  onBitbucketConnectProgress: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      progress: import('../../shared/bitbucket').BitbucketConnectProgress
    ) => callback(progress)
    ipcRenderer.on('gitfreddo:bitbucket-connect-progress', listener)
    return () => ipcRenderer.removeListener('gitfreddo:bitbucket-connect-progress', listener)
  }
}

contextBridge.exposeInMainWorld('gitfreddo', api)

export type { AppSettings, GitFreddoAPI }
