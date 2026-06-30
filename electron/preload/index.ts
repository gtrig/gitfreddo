import { contextBridge, ipcRenderer } from 'electron'
import type { AiFillParams } from '../../shared/ai'
import type { AppSettings, GitFredoAPI, LogEntry, MenuAction } from '../../shared/ipc'

const api: GitFredoAPI = {
  openWorkspace: () => ipcRenderer.invoke('gitfredo:open-workspace'),
  pickDirectory: (defaultPath) => ipcRenderer.invoke('gitfredo:pick-directory', defaultPath),
  cloneRepository: (url, parentDir) =>
    ipcRenderer.invoke('gitfredo:clone-repository', url, parentDir),
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
  }
}

contextBridge.exposeInMainWorld('gitfredo', api)

export type { AppSettings, GitFredoAPI }
