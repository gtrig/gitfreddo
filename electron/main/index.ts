import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join, relative, resolve } from 'path'
import { RepoManager } from '../git/repo-manager'
import { hasGitDir } from '../git/repo-path'
import { deleteRepoFile, resolveRepoFile } from '../git/workspace-files'
import { normalizeRepoPath } from '../git/repo-path'
import { addRecentRepo, loadSettings, saveSettings } from '../settings'
import { buildAppMenu, pickGitBinary, setMainWindow } from '../menu'
import { registerExternalLinkHandlers } from '../external-links'
import { onLog } from '../git/log-bus'
import { cloneRepository } from '../git/clone'
import { initRepository } from '../git/init'
import { aiConfigFromSettings, aiFill } from '../llm/client'
import { enrichAiContext } from '../llm/context'
import {
  connectGitHub,
  connectGitHubPat,
  createGitHubIssue,
  createGitHubPullRequest,
  createGitHubRepo,
  disconnectGitHub,
  forkGitHubRepo,
  getGitHubStatus,
  listGitHubIssues,
  listGitHubPullRequests,
  listGitHubRepos,
  mergeGitHubPullRequest,
  tryGetGitHubRepoContext,
  updateGitHubIssue,
  uploadGitHubSshKey
} from '../github/service'
import type { AiFillParams } from '../../shared/ai'
import type { AppSettings, LogEntry } from '../../shared/ipc'

const repoManager = new RepoManager()
const THEME_BG_COLORS = {
  dark: '#18181b',
  freddo: '#1c1612'
} as const

let settings: AppSettings = {
  theme: 'dark',
  gitBinaryPath: 'git',
  recentRepos: [],
  openRepoTabs: [],
  activeRepoTab: null,
  pollIntervalMs: 5000,
  defaultRemote: 'origin',
  editorCommand: '',
  logMaxCount: 500,
  aiProvider: 'local',
  aiBaseUrl: 'http://localhost:1234',
  aiApiKey: '',
  aiModel: '',
  aiSystemInstructions: '',
  aiCommitInstructions: '',
  aiStashInstructions: '',
  githubLogin: '',
  githubConnectedAt: null,
  pullRebase: false,
  diffViewMode: 'unified'
}

function applyGitConfig(): void {
  repoManager.setConfig({ gitBinaryPath: settings.gitBinaryPath })
}

function applyWindowTheme(theme: AppSettings['theme']): void {
  const backgroundColor = THEME_BG_COLORS[theme]
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.setBackgroundColor(backgroundColor)
    }
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: THEME_BG_COLORS[settings.theme],
    title: 'GitFreddo',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  setMainWindow(mainWindow)
  registerExternalLinkHandlers(mainWindow.webContents)
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => setMainWindow(null))

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  ipcMain.handle('gitfredo:open-workspace', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open repository folder'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return resolve(result.filePaths[0])
  })

  ipcMain.handle('gitfredo:pick-directory', async (_event, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      defaultPath: defaultPath || undefined,
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose folder'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return resolve(result.filePaths[0])
  })

  ipcMain.handle('gitfredo:clone-repository', async (_event, url: string, parentDir: string) => {
    return cloneRepository(url, parentDir, settings.gitBinaryPath)
  })

  ipcMain.handle('gitfredo:init-repository', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Initialize new repository'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return initRepository(resolve(result.filePaths[0]), settings.gitBinaryPath)
  })

  ipcMain.handle('gitfredo:normalize-repo-path', async (_event, repoPath: string) => {
    return normalizeRepoPath(repoPath)
  })

  ipcMain.handle('gitfredo:get-recent-repos', async () => settings.recentRepos)

  ipcMain.handle('gitfredo:get-workspace-path', async () => repoManager.getRepoPath())

  ipcMain.handle('gitfredo:connect', async (_event, repoPath: string) => {
    const normalized = normalizeRepoPath(repoPath)
    if (!hasGitDir(normalized)) {
      throw new Error('No .git found. Open a folder initialized as a git repository.')
    }
    applyGitConfig()
    const connectedPath = await repoManager.connect(normalized)
    settings = await saveSettings(addRecentRepo(settings, connectedPath))
    return connectedPath
  })

  ipcMain.handle('gitfredo:switch-workspace', async (_event, repoPath: string) => {
    return repoManager.switchRepo(repoPath)
  })

  ipcMain.handle('gitfredo:disconnect-workspace', async (_event, repoPath: string) => {
    await repoManager.disconnectRepo(repoPath)
  })

  ipcMain.handle('gitfredo:list-workspaces', async () => repoManager.listRepos())

  ipcMain.handle('gitfredo:disconnect', async () => {
    await repoManager.disconnectAll()
  })

  ipcMain.handle(
    'gitfredo:invoke',
    async (_event, method: string, params?: unknown, repoPath?: string) => {
      if (method === 'ai.fill') {
        const enriched = await enrichAiContext(repoManager, params as AiFillParams)
        return aiFill(aiConfigFromSettings(settings), enriched)
      }
      return repoManager.invoke(repoPath, method, params)
    }
  )

  ipcMain.handle('gitfredo:get-settings', async () => settings)

  ipcMain.handle('gitfredo:set-settings', async (_event, patch: Partial<AppSettings>) => {
    settings = await saveSettings(patch)
    applyGitConfig()
    if (patch.theme) {
      applyWindowTheme(settings.theme)
    }
    return settings
  })

  ipcMain.handle('gitfredo:ai-fill', async (_event, params: AiFillParams) => {
    const enriched = await enrichAiContext(repoManager, params)
    return aiFill(aiConfigFromSettings(settings), enriched)
  })

  ipcMain.handle('gitfredo:github-get-status', async () => getGitHubStatus(settings))

  ipcMain.handle('gitfredo:github-connect', async (event) => {
    const result = await connectGitHub((progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('gitfredo:github-connect-progress', progress)
      }
    })
    settings = result.settings
    return result.status
  })

  ipcMain.handle('gitfredo:github-connect-pat', async (_event, token: string) => {
    const result = await connectGitHubPat(token)
    settings = result.settings
    return result.status
  })

  ipcMain.handle('gitfredo:github-disconnect', async () => {
    settings = await disconnectGitHub(settings)
  })

  ipcMain.handle('gitfredo:github-list-repos', async (_event, params) => listGitHubRepos(params))

  ipcMain.handle('gitfredo:github-create-repo', async (_event, params) => createGitHubRepo(params))

  ipcMain.handle('gitfredo:github-fork-repo', async (_event, owner: string, repo: string) =>
    forkGitHubRepo(owner, repo)
  )

  ipcMain.handle('gitfredo:github-upload-ssh-key', async (_event, title: string) =>
    uploadGitHubSshKey(title)
  )

  ipcMain.handle('gitfredo:github-get-repo-context', async (_event, repoPath: string) =>
    tryGetGitHubRepoContext(repoPath, settings)
  )

  ipcMain.handle('gitfredo:github-list-pull-requests', async (_event, repoPath: string) =>
    listGitHubPullRequests(repoPath, settings)
  )

  ipcMain.handle('gitfredo:github-create-pull-request', async (_event, repoPath: string, params) =>
    createGitHubPullRequest(repoPath, settings, params)
  )

  ipcMain.handle('gitfredo:github-merge-pull-request', async (
    _event,
    repoPath: string,
    number: number,
    method
  ) => mergeGitHubPullRequest(repoPath, settings, number, method))

  ipcMain.handle(
    'gitfredo:github-list-issues',
    async (_event, repoPath: string, assigneeLogin?: string) =>
      listGitHubIssues(repoPath, settings, assigneeLogin)
  )

  ipcMain.handle('gitfredo:github-create-issue', async (_event, repoPath: string, params) =>
    createGitHubIssue(repoPath, settings, params)
  )

  ipcMain.handle('gitfredo:github-update-issue', async (
    _event,
    repoPath: string,
    number: number,
    params
  ) => updateGitHubIssue(repoPath, settings, number, params))

  ipcMain.handle('gitfredo:pick-file', async () => {
    const repo = repoManager.getRepoPath()
    if (!repo) return null
    const result = await dialog.showOpenDialog({
      defaultPath: repo,
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return relative(repo, result.filePaths[0])
  })

  ipcMain.handle('gitfredo:pick-files', async () => {
    const repo = repoManager.getRepoPath()
    if (!repo) return null
    const result = await dialog.showOpenDialog({
      defaultPath: repo,
      properties: ['openFile', 'multiSelections']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths.map((filePath) => relative(repo, filePath))
  })

  ipcMain.handle('gitfredo:pick-git-binary', async () => pickGitBinary())

  ipcMain.handle('gitfredo:delete-workspace-file', async (_event, relativePath: string) => {
    const repo = repoManager.getRepoPath()
    if (!repo) throw new Error('No repository connected')
    await deleteRepoFile(repo, relativePath)
  })

  ipcMain.handle('gitfredo:open-in-editor', async (_event, relativePath: string) => {
    const repo = repoManager.getRepoPath()
    if (!repo) throw new Error('No repository connected')
    const fullPath = resolveRepoFile(repo, relativePath)
    const error = await shell.openPath(fullPath)
    if (error) throw new Error(error)
  })
}

function registerProtocolHandler(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('gitfredo', process.execPath, [resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('gitfredo')
  }

  app.on('open-url', (event, url) => {
    event.preventDefault()
    if (url.startsWith('gitfredo://oauth/github')) {
      shell.openExternal(url)
    }
  })
}

function broadcastLogEntry(entry: LogEntry): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('gitfredo:log-entry', entry)
    }
  }
}

app.whenReady().then(async () => {
  settings = await loadSettings()
  applyGitConfig()
  onLog(broadcastLogEntry)
  registerProtocolHandler()
  buildAppMenu()
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', async () => {
  await repoManager.disconnectAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
