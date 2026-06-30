import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join, relative, resolve } from 'path'
import { RepoManager } from '../git/repo-manager'
import { hasGitDir } from '../git/repo-path'
import { deleteRepoFile, resolveRepoFile } from '../git/workspace-files'
import { normalizeRepoPath } from '../git/repo-path'
import { addRecentRepo, loadSettings, saveSettings } from '../settings'
import { buildAppMenu, pickGitBinary, setMainWindow } from '../menu'
import { onLog } from '../git/log-bus'
import { cloneRepository } from '../git/clone'
import { aiConfigFromSettings, aiFill } from '../llm/client'
import { enrichAiContext } from '../llm/context'
import type { AiFillParams } from '../../shared/ai'
import type { AppSettings, LogEntry } from '../../shared/ipc'

const repoManager = new RepoManager()
let settings: AppSettings = {
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
  aiModel: ''
}

function applyGitConfig(): void {
  repoManager.setConfig({ gitBinaryPath: settings.gitBinaryPath })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#0f1117',
    title: 'GitFredo',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  setMainWindow(mainWindow)
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

  ipcMain.handle('gitfredo:normalize-repo-path', async (_event, repoPath: string) => {
    return normalizeRepoPath(repoPath)
  })

  ipcMain.handle('gitfredo:get-recent-repos', async () => settings.recentRepos)

  ipcMain.handle('gitfredo:get-workspace-path', async () => repoManager.getRepoPath())

  ipcMain.handle('gitfredo:connect', async (_event, repoPath: string) => {
    const normalized = normalizeRepoPath(repoPath)
    if (!hasGitDir(normalized)) {
      throw new Error('No .git directory found. Open a folder initialized as a git repository.')
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
    return settings
  })

  ipcMain.handle('gitfredo:ai-fill', async (_event, params: AiFillParams) => {
    const enriched = await enrichAiContext(repoManager, params)
    return aiFill(aiConfigFromSettings(settings), enriched)
  })

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
