import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { loadAppIcon } from '../app-icon'
import { join, relative, resolve } from 'path'
import { RepoManager } from '../git/repo-manager'
import { hasGitDir } from '../git/repo-path'
import { deleteRepoFile, resolveRepoFile } from '../git/workspace-files'
import { openInEditor } from '../open-in-editor'
import { normalizeRepoPath } from '../git/repo-path'
import { loadSettings, nextRecentRepos, saveSettings } from '../settings'
import { preserveIntegrationSettings } from '../../shared/integration-settings'
import { hasBitbucketToken } from '../bitbucket/token-store'
import { hasGitHubToken } from '../github/token-store'
import { exportSettingsBackup, importSettingsBackup } from '../settings-backup'
import { buildAppMenu, pickGitBinary, setMainWindow } from '../menu'
import {
  applyUpdaterSettings,
  checkForUpdates,
  downloadUpdate,
  getAppVersion,
  initAutoUpdater,
  installUpdate,
  scheduleStartupCheck
} from '../update/auto-update'
import { registerExternalLinkHandlers } from '../external-links'
import { onLog } from '../git/log-bus'
import type { GitIpcMethod, GitIpcParams } from '../../shared/git/ipc'
import { cloneRepository } from '../git/clone'
import { initRepository } from '../git/init'
import { aiConfigFromSettings, aiFill } from '../llm/client'
import { enrichAiContext } from '../llm/context'
import { applyStoredZoom, getZoomFactor, zoomIn, zoomOut } from '../zoom'
import {
  connectGitHub,
  connectGitHubPat,
  createGitHubIssue,
  createGitHubPullRequest,
  createGitHubRepo,
  disconnectGitHub,
  forkGitHubRepo,
  getGitHubPullRequest,
  getGitHubStatus,
  listGitHubIssues,
  listGitHubPullRequestFiles,
  listGitHubPullRequests,
  listGitHubRepos,
  mergeGitHubPullRequest,
  postGitHubPullRequestComment,
  reopenGitHubPullRequest,
  tryGetGitHubRepoContext,
  updateGitHubIssue,
  uploadGitHubSshKey
} from '../github/service'
import {
  connectBitbucket,
  connectBitbucketAppPassword,
  createBitbucketIssue,
  createBitbucketPullRequest,
  createBitbucketRepo,
  disconnectBitbucket,
  forkBitbucketRepo,
  getBitbucketStatus,
  listBitbucketIssues,
  listBitbucketPullRequests,
  listBitbucketRepos,
  listBitbucketWorkspaces,
  mergeBitbucketPullRequest,
  tryGetBitbucketRepoContext,
  updateBitbucketIssue,
  uploadBitbucketSshKey
} from '../bitbucket/service'
import type { AiFillParams } from '../../shared/ai'
import type { AppSettings, LogEntry, RepoChangeEvent } from '../../shared/ipc'
import { THEME_BG_COLORS } from '../../shared/themes'
import { RepoWatcherManager } from '../git/repo-watcher'
import { loadDotEnvFile } from '../load-dotenv'

loadDotEnvFile()

/** Playwright runs multiple Electron apps in parallel; skip the desktop single-instance lock. */
const isE2e = process.env.GITFREDDO_E2E === '1'
const gotSingleInstanceLock = isE2e || app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

function focusMainWindow(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
    return
  }
}

if (gotSingleInstanceLock) {
  app.on('second-instance', () => {
    focusMainWindow()
  })
}

const repoManager = new RepoManager()
const repoWatcherManager = new RepoWatcherManager({
  onChange: broadcastRepoChange
})

if (process.platform === 'linux') {
  const linuxApp = app as typeof app & { setDesktopName?: (name: string) => void }
  linuxApp.setDesktopName?.('gitfreddo.desktop')
}

let settings: AppSettings = {
  theme: 'black',
  locale: 'en',
  gitBinaryPath: 'git',
  recentRepos: [],
  openRepoTabs: [],
  activeRepoTab: null,
  pollIntervalMs: 5000,
  defaultRemote: 'origin',
  editorCommand: '',
  logMaxCount: 500,
  aiEnabled: false,
  aiProvider: 'local',
  aiBaseUrl: 'http://localhost:1234',
  aiApiKey: '',
  aiModel: '',
  aiSystemInstructions: '',
  aiCommitInstructions: '',
  aiStashInstructions: '',
  aiConflictInstructions: '',
  githubLogin: '',
  githubConnectedAt: null,
  githubSshKeyTitle: '',
  bitbucketLogin: '',
  bitbucketAuthLogin: '',
  bitbucketConnectedAt: null,
  bitbucketAuthType: null,
  bitbucketSshKeyTitle: '',
  pullRebase: false,
  submoduleRecursion: 'on-demand',
  pushSubmoduleRecursion: 'check',
  diffViewMode: 'unified',
  uiZoomFactor: 1,
  updateChannel: 'stable',
  autoDownloadUpdates: false,
  checkForUpdatesOnStartup: true
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
    icon: loadAppIcon(),
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
  mainWindow.once('ready-to-show', () => {
    applyStoredZoom(settings.uiZoomFactor)
    mainWindow.show()
  })
  mainWindow.webContents.on('zoom-changed', () => {
    const zoomFactor = mainWindow.webContents.getZoomFactor()
    void persistZoomFactor(zoomFactor)
    broadcastZoomFactor(zoomFactor)
  })
  mainWindow.on('closed', () => setMainWindow(null))

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function broadcastZoomFactor(factor: number): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('gitfreddo:zoom-changed', factor)
    }
  }
}

function broadcastRepoChange(event: RepoChangeEvent): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('gitfreddo:repo-changed', event)
    }
  }
}

async function persistZoomFactor(factor: number): Promise<void> {
  const rounded = Math.min(2, Math.max(0.5, Math.round(factor * 10) / 10))
  if (settings.uiZoomFactor === rounded) {
    return
  }
  settings = await saveSettings({ uiZoomFactor: rounded })
}

function applySettingsSideEffects(previous: AppSettings, next: AppSettings): void {
  applyGitConfig()
  if (previous.theme !== next.theme) {
    applyWindowTheme(next.theme)
  }
  if (previous.uiZoomFactor !== next.uiZoomFactor) {
    applyStoredZoom(next.uiZoomFactor)
  }
  if (
    previous.updateChannel !== next.updateChannel ||
    previous.autoDownloadUpdates !== next.autoDownloadUpdates ||
    previous.checkForUpdatesOnStartup !== next.checkForUpdatesOnStartup
  ) {
    applyUpdaterSettings(next)
    scheduleStartupCheck(() => settings)
  }
}

function registerIpc(): void {
  ipcMain.handle('gitfreddo:open-workspace', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open repository folder'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return resolve(result.filePaths[0])
  })

  ipcMain.handle('gitfreddo:pick-directory', async (_event, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      defaultPath: defaultPath || undefined,
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose folder'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return resolve(result.filePaths[0])
  })

  ipcMain.handle('gitfreddo:clone-repository', async (_event, url: string, parentDir: string) => {
    return cloneRepository(url, parentDir, settings.gitBinaryPath, settings.submoduleRecursion)
  })

  ipcMain.handle('gitfreddo:init-repository', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Initialize new repository'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return initRepository(resolve(result.filePaths[0]), settings.gitBinaryPath)
  })

  ipcMain.handle('gitfreddo:normalize-repo-path', async (_event, repoPath: string) => {
    return normalizeRepoPath(repoPath)
  })

  ipcMain.handle('gitfreddo:get-recent-repos', async () => settings.recentRepos)

  ipcMain.handle('gitfreddo:get-workspace-path', async () => repoManager.getRepoPath())

  ipcMain.handle('gitfreddo:connect', async (_event, repoPath: string) => {
    const normalized = normalizeRepoPath(repoPath)
    if (!hasGitDir(normalized)) {
      throw new Error('No .git found. Open a folder initialized as a git repository.')
    }
    applyGitConfig()
    const connectedPath = await repoManager.connect(normalized)
    repoWatcherManager.watch(connectedPath)
    settings = await saveSettings({
      recentRepos: nextRecentRepos(settings.recentRepos, connectedPath)
    })
    return connectedPath
  })

  ipcMain.handle('gitfreddo:switch-workspace', async (_event, repoPath: string) => {
    return repoManager.switchRepo(repoPath)
  })

  ipcMain.handle('gitfreddo:disconnect-workspace', async (_event, repoPath: string) => {
    const normalized = normalizeRepoPath(repoPath)
    await repoManager.disconnectRepo(normalized)
    repoWatcherManager.unwatch(normalized)
  })

  ipcMain.handle('gitfreddo:list-workspaces', async () => repoManager.listRepos())

  ipcMain.handle('gitfreddo:disconnect', async () => {
    await repoManager.disconnectAll()
    repoWatcherManager.unwatchAll()
  })

  ipcMain.handle(
    'gitfreddo:invoke',
    async (_event, method: string, params?: unknown, repoPath?: string) => {
      if (method === 'ai.fill') {
        if (!settings.aiEnabled) {
          throw new Error('AI assist is disabled in settings.')
        }
        const enriched = await enrichAiContext(repoManager, params as AiFillParams)
        return aiFill(aiConfigFromSettings(settings), enriched)
      }
      return repoManager.invoke(
        repoPath,
        method as GitIpcMethod,
        params as GitIpcParams<GitIpcMethod>
      )
    }
  )

  ipcMain.handle('gitfreddo:get-settings', async () => settings)

  ipcMain.handle('gitfreddo:set-settings', async (_event, patch: Partial<AppSettings>) => {
    const previous = settings
    const safePatch = preserveIntegrationSettings(settings, patch, {
      hasBitbucketToken: await hasBitbucketToken(),
      hasGitHubToken: await hasGitHubToken()
    })
    settings = await saveSettings(safePatch)
    applySettingsSideEffects(previous, settings)
    return settings
  })

  ipcMain.handle('gitfreddo:export-settings-backup', async () => {
    return exportSettingsBackup(settings, getAppVersion())
  })

  ipcMain.handle('gitfreddo:import-settings-backup', async () => {
    const previous = settings
    const restored = await importSettingsBackup()
    if (!restored) {
      return null
    }
    settings = restored
    applySettingsSideEffects(previous, settings)
    return settings
  })

  ipcMain.handle('gitfreddo:ai-fill', async (_event, params: AiFillParams) => {
    if (!settings.aiEnabled) {
      throw new Error('AI assist is disabled in settings.')
    }
    const enriched = await enrichAiContext(repoManager, params)
    return aiFill(aiConfigFromSettings(settings), enriched)
  })

  ipcMain.handle('gitfreddo:github-get-status', async () => {
    const result = await getGitHubStatus(settings)
    settings = result.settings
    return result.status
  })

  ipcMain.handle('gitfreddo:github-connect', async (event) => {
    const result = await connectGitHub((progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('gitfreddo:github-connect-progress', progress)
      }
    })
    settings = result.settings
    return result.status
  })

  ipcMain.handle('gitfreddo:github-connect-pat', async (_event, token: string) => {
    const result = await connectGitHubPat(token)
    settings = result.settings
    return result.status
  })

  ipcMain.handle('gitfreddo:github-disconnect', async () => {
    settings = await disconnectGitHub(settings)
  })

  ipcMain.handle('gitfreddo:github-list-repos', async (_event, params) => listGitHubRepos(params))

  ipcMain.handle('gitfreddo:github-create-repo', async (_event, params) => createGitHubRepo(params))

  ipcMain.handle('gitfreddo:github-fork-repo', async (_event, owner: string, repo: string) =>
    forkGitHubRepo(owner, repo)
  )

  ipcMain.handle('gitfreddo:github-upload-ssh-key', async (_event, title: string) => {
    const uploaded = await uploadGitHubSshKey(settings, title)
    settings = uploaded.settings
    return uploaded.result
  })

  ipcMain.handle('gitfreddo:github-get-repo-context', async (_event, repoPath: string) =>
    tryGetGitHubRepoContext(repoPath, settings)
  )

  ipcMain.handle('gitfreddo:github-list-pull-requests', async (_event, repoPath: string) =>
    listGitHubPullRequests(repoPath, settings)
  )

  ipcMain.handle('gitfreddo:github-get-pull-request', async (
    _event,
    repoPath: string,
    number: number
  ) => getGitHubPullRequest(repoPath, settings, number))

  ipcMain.handle('gitfreddo:github-list-pull-request-files', async (
    _event,
    repoPath: string,
    number: number
  ) => listGitHubPullRequestFiles(repoPath, settings, number))

  ipcMain.handle('gitfreddo:github-create-pull-request', async (_event, repoPath: string, params) =>
    createGitHubPullRequest(repoPath, settings, params)
  )

  ipcMain.handle('gitfreddo:github-merge-pull-request', async (
    _event,
    repoPath: string,
    number: number,
    method
  ) => mergeGitHubPullRequest(repoPath, settings, number, method))

  ipcMain.handle('gitfreddo:github-reopen-pull-request', async (
    _event,
    repoPath: string,
    number: number
  ) => reopenGitHubPullRequest(repoPath, settings, number))

  ipcMain.handle('gitfreddo:github-post-pull-request-comment', async (
    _event,
    repoPath: string,
    number: number,
    body: string
  ) => postGitHubPullRequestComment(repoPath, settings, number, body))

  ipcMain.handle(
    'gitfreddo:github-list-issues',
    async (_event, repoPath: string, assigneeLogin?: string) =>
      listGitHubIssues(repoPath, settings, assigneeLogin)
  )

  ipcMain.handle('gitfreddo:github-create-issue', async (_event, repoPath: string, params) =>
    createGitHubIssue(repoPath, settings, params)
  )

  ipcMain.handle('gitfreddo:github-update-issue', async (
    _event,
    repoPath: string,
    number: number,
    params
  ) => updateGitHubIssue(repoPath, settings, number, params))

  ipcMain.handle('gitfreddo:bitbucket-get-status', async () => {
    const result = await getBitbucketStatus(settings)
    settings = result.settings
    return result.status
  })

  ipcMain.handle('gitfreddo:bitbucket-connect', async (event) => {
    const result = await connectBitbucket((progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('gitfreddo:bitbucket-connect-progress', progress)
      }
    })
    settings = result.settings
    return result.status
  })

  ipcMain.handle(
    'gitfreddo:bitbucket-connect-app-password',
    async (_event, username: string, password: string) => {
      const result = await connectBitbucketAppPassword(username, password)
      settings = result.settings
      return result.status
    }
  )

  ipcMain.handle('gitfreddo:bitbucket-disconnect', async () => {
    settings = await disconnectBitbucket(settings)
  })

  ipcMain.handle('gitfreddo:bitbucket-list-repos', async (_event, params) =>
    listBitbucketRepos(settings, params)
  )

  ipcMain.handle('gitfreddo:bitbucket-list-workspaces', async () =>
    listBitbucketWorkspaces(settings)
  )

  ipcMain.handle('gitfreddo:bitbucket-create-repo', async (_event, params) =>
    createBitbucketRepo(settings, params)
  )

  ipcMain.handle('gitfreddo:bitbucket-fork-repo', async (_event, workspace: string, repo: string) =>
    forkBitbucketRepo(settings, workspace, repo)
  )

  ipcMain.handle('gitfreddo:bitbucket-upload-ssh-key', async (_event, title: string) => {
    const uploaded = await uploadBitbucketSshKey(settings, title)
    settings = uploaded.settings
    return uploaded.result
  })

  ipcMain.handle('gitfreddo:bitbucket-get-repo-context', async (_event, repoPath: string) =>
    tryGetBitbucketRepoContext(repoPath, settings)
  )

  ipcMain.handle('gitfreddo:bitbucket-list-pull-requests', async (_event, repoPath: string) =>
    listBitbucketPullRequests(repoPath, settings)
  )

  ipcMain.handle(
    'gitfreddo:bitbucket-create-pull-request',
    async (_event, repoPath: string, params) =>
      createBitbucketPullRequest(repoPath, settings, params)
  )

  ipcMain.handle(
    'gitfreddo:bitbucket-merge-pull-request',
    async (_event, repoPath: string, number: number, method) =>
      mergeBitbucketPullRequest(repoPath, settings, number, method)
  )

  ipcMain.handle(
    'gitfreddo:bitbucket-list-issues',
    async (_event, repoPath: string, assigneeLogin?: string) =>
      listBitbucketIssues(repoPath, settings, assigneeLogin)
  )

  ipcMain.handle('gitfreddo:bitbucket-create-issue', async (_event, repoPath: string, params) =>
    createBitbucketIssue(repoPath, settings, params)
  )

  ipcMain.handle(
    'gitfreddo:bitbucket-update-issue',
    async (_event, repoPath: string, number: number, params) =>
      updateBitbucketIssue(repoPath, settings, number, params)
  )

  ipcMain.handle('gitfreddo:pick-file', async () => {
    const repo = repoManager.getRepoPath()
    if (!repo) return null
    const result = await dialog.showOpenDialog({
      defaultPath: repo,
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return relative(repo, result.filePaths[0])
  })

  ipcMain.handle('gitfreddo:pick-files', async () => {
    const repo = repoManager.getRepoPath()
    if (!repo) return null
    const result = await dialog.showOpenDialog({
      defaultPath: repo,
      properties: ['openFile', 'multiSelections']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths.map((filePath) => relative(repo, filePath))
  })

  ipcMain.handle('gitfreddo:pick-git-binary', async () => pickGitBinary())

  ipcMain.handle('gitfreddo:delete-workspace-file', async (_event, relativePath: string) => {
    const repo = repoManager.getRepoPath()
    if (!repo) throw new Error('No repository connected')
    await deleteRepoFile(repo, relativePath)
  })

  ipcMain.handle('gitfreddo:open-in-editor', async (_event, relativePath: string) => {
    const repo = repoManager.getRepoPath()
    if (!repo) throw new Error('No repository connected')
    const fullPath = resolveRepoFile(repo, relativePath)
    await openInEditor(settings.editorCommand, fullPath)
  })

  ipcMain.handle('gitfreddo:get-zoom-factor', async () => getZoomFactor())

  ipcMain.handle('gitfreddo:zoom-in', async () => zoomIn())

  ipcMain.handle('gitfreddo:zoom-out', async () => zoomOut())

  ipcMain.handle('gitfreddo:get-app-version', async () => getAppVersion())

  ipcMain.handle('gitfreddo:check-for-updates', async () => {
    await checkForUpdates()
  })

  ipcMain.handle('gitfreddo:download-update', async () => {
    await downloadUpdate()
  })

  ipcMain.handle('gitfreddo:install-update', async () => {
    installUpdate()
  })
}

function registerProtocolHandler(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('gitfreddo', process.execPath, [resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('gitfreddo')
  }

  app.on('open-url', (event, url) => {
    event.preventDefault()
    if (url.startsWith('gitfreddo://oauth/github')) {
      shell.openExternal(url)
    }
  })
}

function broadcastLogEntry(entry: LogEntry): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('gitfreddo:log-entry', entry)
    }
  }
}

if (gotSingleInstanceLock) {
  app.whenReady().then(async () => {
    settings = await loadSettings()
    applyGitConfig()
    onLog(broadcastLogEntry)
    registerProtocolHandler()
    buildAppMenu()
    registerIpc()
    initAutoUpdater(() => settings)
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', async () => {
    repoWatcherManager.dispose()
    await repoManager.disconnectAll()
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
