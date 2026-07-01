import { contextBridge, ipcRenderer } from 'electron'
import type { AiFillParams } from '../../shared/ai'
import type { AppSettings, GitFreddoAPI, LogEntry, MenuAction } from '../../shared/ipc'

const api: GitFreddoAPI = {
  openWorkspace: () => ipcRenderer.invoke('gitfredo:open-workspace'),
  pickDirectory: (defaultPath) => ipcRenderer.invoke('gitfredo:pick-directory', defaultPath),
  cloneRepository: (url, parentDir) =>
    ipcRenderer.invoke('gitfredo:clone-repository', url, parentDir),
  initRepository: () => ipcRenderer.invoke('gitfredo:init-repository'),
  normalizeRepoPath: (repoPath) => ipcRenderer.invoke('gitfredo:normalize-repo-path', repoPath),
  getRecentRepos: () => ipcRenderer.invoke('gitfredo:get-recent-repos'),
  getWorkspacePath: () => ipcRenderer.invoke('gitfredo:get-workspace-path'),
  connect: (repoPath) => ipcRenderer.invoke('gitfredo:connect', repoPath),
  switchWorkspace: (repoPath) => ipcRenderer.invoke('gitfredo:switch-workspace', repoPath),
  disconnectWorkspace: (repoPath) => ipcRenderer.invoke('gitfredo:disconnect-workspace', repoPath),
  listWorkspaces: () => ipcRenderer.invoke('gitfredo:list-workspaces'),
  disconnect: () => ipcRenderer.invoke('gitfredo:disconnect'),
  invoke: (method, params, repoPath) =>
    ipcRenderer.invoke('gitfredo:invoke', method, params, repoPath),
  pickFile: () => ipcRenderer.invoke('gitfredo:pick-file'),
  pickFiles: () => ipcRenderer.invoke('gitfredo:pick-files'),
  pickGitBinary: () => ipcRenderer.invoke('gitfredo:pick-git-binary'),
  deleteWorkspaceFile: (relativePath) =>
    ipcRenderer.invoke('gitfredo:delete-workspace-file', relativePath),
  openInEditor: (relativePath) => ipcRenderer.invoke('gitfredo:open-in-editor', relativePath),
  getSettings: () => ipcRenderer.invoke('gitfredo:get-settings'),
  setSettings: (patch) => ipcRenderer.invoke('gitfredo:set-settings', patch),
  githubGetStatus: () => ipcRenderer.invoke('gitfredo:github-get-status'),
  githubConnect: () => ipcRenderer.invoke('gitfredo:github-connect'),
  githubConnectPat: (token) => ipcRenderer.invoke('gitfredo:github-connect-pat', token),
  githubDisconnect: () => ipcRenderer.invoke('gitfredo:github-disconnect'),
  githubListRepos: (params) => ipcRenderer.invoke('gitfredo:github-list-repos', params),
  githubCreateRepo: (params) => ipcRenderer.invoke('gitfredo:github-create-repo', params),
  githubForkRepo: (owner, repo) => ipcRenderer.invoke('gitfredo:github-fork-repo', owner, repo),
  githubUploadSshKey: (title) => ipcRenderer.invoke('gitfredo:github-upload-ssh-key', title),
  githubGetRepoContext: (repoPath) =>
    ipcRenderer.invoke('gitfredo:github-get-repo-context', repoPath),
  githubListPullRequests: (repoPath) =>
    ipcRenderer.invoke('gitfredo:github-list-pull-requests', repoPath),
  githubCreatePullRequest: (repoPath, params) =>
    ipcRenderer.invoke('gitfredo:github-create-pull-request', repoPath, params),
  githubMergePullRequest: (repoPath, number, method) =>
    ipcRenderer.invoke('gitfredo:github-merge-pull-request', repoPath, number, method),
  githubListIssues: (repoPath, assigneeLogin) =>
    ipcRenderer.invoke('gitfredo:github-list-issues', repoPath, assigneeLogin),
  githubCreateIssue: (repoPath, params) =>
    ipcRenderer.invoke('gitfredo:github-create-issue', repoPath, params),
  githubUpdateIssue: (repoPath, number, params) =>
    ipcRenderer.invoke('gitfredo:github-update-issue', repoPath, number, params),
  aiFill: (params: AiFillParams) => ipcRenderer.invoke('gitfredo:ai-fill', params),
  onMenuAction: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, action: MenuAction) => callback(action)
    ipcRenderer.on('app:menu', listener)
    return () => ipcRenderer.removeListener('app:menu', listener)
  },
  onLogEntry: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, entry: LogEntry) => callback(entry)
    ipcRenderer.on('gitfredo:log-entry', listener)
    return () => ipcRenderer.removeListener('gitfredo:log-entry', listener)
  },
  onGitHubConnectProgress: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      progress: import('../../shared/github').GitHubConnectProgress
    ) => callback(progress)
    ipcRenderer.on('gitfredo:github-connect-progress', listener)
    return () => ipcRenderer.removeListener('gitfredo:github-connect-progress', listener)
  }
}

contextBridge.exposeInMainWorld('gitfredo', api)

export type { AppSettings, GitFreddoAPI }
