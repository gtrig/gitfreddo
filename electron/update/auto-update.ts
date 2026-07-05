import { app, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import type { AppSettings } from '../../shared/ipc'
import { applyUpdateChannel, type UpdateEvent, sanitizeUpdateErrorMessage } from '../../shared/update'
import { emitLog } from '../git/log-bus'

const { autoUpdater } = electronUpdater

const STARTUP_CHECK_DELAY_MS = 10_000

let startupTimer: ReturnType<typeof setTimeout> | null = null
let enabled = false

function broadcast(event: UpdateEvent): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('gitfreddo:update-event', event)
    }
  }
}

export function applyUpdaterSettings(settings: AppSettings): void {
  if (!enabled) return
  autoUpdater.autoDownload = settings.autoDownloadUpdates
  autoUpdater.allowPrerelease = applyUpdateChannel(settings.updateChannel).allowPrerelease
}

export function initAutoUpdater(getSettings: () => AppSettings): void {
  if (!app.isPackaged) {
    emitLog('app', 'debug', 'Auto-update disabled in development')
    return
  }

  enabled = true
  autoUpdater.autoInstallOnAppQuit = true
  const githubToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN
  if (githubToken) {
    autoUpdater.requestHeaders = {
      Authorization: `Bearer ${githubToken}`
    }
  }
  applyUpdaterSettings(getSettings())

  autoUpdater.on('checking-for-update', () => {
    emitLog('app', 'info', 'Checking for updates…')
    broadcast({ type: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    emitLog('app', 'info', `Update available: ${info.version}`)
    broadcast({
      type: 'available',
      version: info.version,
      releaseNotes: formatReleaseNotes(info.releaseNotes)
    })
    if (getSettings().autoDownloadUpdates) {
      void autoUpdater.downloadUpdate().catch((error: Error) => {
        broadcast({ type: 'error', message: error.message })
      })
    }
  })

  autoUpdater.on('update-not-available', (info) => {
    emitLog('app', 'info', `App is up to date (${info.version})`)
    broadcast({ type: 'not-available', version: info.version })
  })

  autoUpdater.on('download-progress', (progress) => {
    broadcast({ type: 'progress', percent: progress.percent })
  })

  autoUpdater.on('update-downloaded', (info) => {
    emitLog('app', 'info', `Update downloaded: ${info.version}`)
    broadcast({ type: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (error) => {
    const raw = error.message || String(error)
    const message = sanitizeUpdateErrorMessage(raw)
    emitLog('app', 'error', `Update error: ${raw}`)
    broadcast({ type: 'error', message })
  })

  scheduleStartupCheck(getSettings)
}

export function scheduleStartupCheck(getSettings: () => AppSettings): void {
  if (!enabled) return
  if (startupTimer) {
    clearTimeout(startupTimer)
    startupTimer = null
  }
  if (!getSettings().checkForUpdatesOnStartup) return

  startupTimer = setTimeout(() => {
    startupTimer = null
    void checkForUpdates()
  }, STARTUP_CHECK_DELAY_MS)
}

export async function checkForUpdates(): Promise<void> {
  if (!enabled) {
    broadcast({ type: 'not-available', version: app.getVersion() })
    return
  }
  await autoUpdater.checkForUpdates()
}

export async function downloadUpdate(): Promise<void> {
  if (!enabled) return
  await autoUpdater.downloadUpdate()
}

export function installUpdate(): void {
  if (!enabled) return
  autoUpdater.quitAndInstall()
}

export function getAppVersion(): string {
  return app.getVersion()
}

function formatReleaseNotes(notes: unknown): string | undefined {
  if (!notes) return undefined
  if (typeof notes === 'string') return notes
  if (!Array.isArray(notes)) return undefined
  return notes
    .map((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object' && 'note' in entry) {
        const note = (entry as { note?: string | null }).note
        return note ?? ''
      }
      return ''
    })
    .filter(Boolean)
    .join('\n\n')
}
