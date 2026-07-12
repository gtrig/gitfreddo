import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { applyUpdateChannel } from '../../shared/update'

const eventHandlers: Record<string, (...args: unknown[]) => void> = {}
const mockSend = vi.fn()
const mockWebContents = { send: mockSend }
const mockWindow = {
  isDestroyed: () => false,
  webContents: mockWebContents
}

const mockAutoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  allowPrerelease: false,
  requestHeaders: undefined as Record<string, string> | undefined,
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    eventHandlers[event] = handler
  }),
  checkForUpdates: vi.fn(async () => null),
  downloadUpdate: vi.fn(async () => null),
  quitAndInstall: vi.fn()
}

let isPackaged = true
let appVersion = '0.2.8'

vi.mock('electron-updater', () => ({
  default: { autoUpdater: mockAutoUpdater }
}))

vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return isPackaged
    },
    getVersion: () => appVersion
  },
  BrowserWindow: {
    getAllWindows: () => [mockWindow]
  }
}))

vi.mock('../git/log-bus', () => ({
  emitLog: vi.fn()
}))

const defaultSettings = {
  autoDownloadUpdates: false,
  updateChannel: 'stable' as const,
  checkForUpdatesOnStartup: false
}

async function loadModule() {
  return import('./auto-update')
}

describe('auto-update', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useRealTimers()
    isPackaged = true
    appVersion = '0.2.8'
    mockAutoUpdater.autoDownload = false
    mockAutoUpdater.allowPrerelease = false
    mockAutoUpdater.requestHeaders = undefined
    for (const key of Object.keys(eventHandlers)) {
      delete eventHandlers[key]
    }
    mockAutoUpdater.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      eventHandlers[event] = handler
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('applyUpdaterSettings', () => {
    it('maps settings to autoUpdater flags when enabled', async () => {
      const { applyUpdaterSettings, initAutoUpdater } = await loadModule()
      initAutoUpdater(() => ({
        ...defaultSettings,
        autoDownloadUpdates: true,
        updateChannel: 'beta'
      } as import('../../shared/ipc').AppSettings))

      applyUpdaterSettings({
        autoDownloadUpdates: true,
        updateChannel: 'beta',
        checkForUpdatesOnStartup: false
      } as import('../../shared/ipc').AppSettings)

      expect(mockAutoUpdater.autoDownload).toBe(true)
      expect(mockAutoUpdater.allowPrerelease).toBe(applyUpdateChannel('beta').allowPrerelease)
    })

    it('no-ops when updater is not enabled', async () => {
      isPackaged = false
      const { applyUpdaterSettings, initAutoUpdater } = await loadModule()
      initAutoUpdater(() => defaultSettings as import('../../shared/ipc').AppSettings)

      applyUpdaterSettings({
        autoDownloadUpdates: true,
        updateChannel: 'beta',
        checkForUpdatesOnStartup: false
      } as import('../../shared/ipc').AppSettings)

      expect(mockAutoUpdater.autoDownload).toBe(false)
    })
  })

  describe('initAutoUpdater', () => {
    it('skips initialization in development', async () => {
      isPackaged = false
      const { initAutoUpdater, checkForUpdates } = await loadModule()
      initAutoUpdater(() => defaultSettings as import('../../shared/ipc').AppSettings)

      await checkForUpdates()
      expect(mockAutoUpdater.on).not.toHaveBeenCalled()
      expect(mockSend).toHaveBeenCalledWith('gitfreddo:update-event', {
        type: 'not-available',
        version: '0.2.8'
      })
    })

    it('sets GitHub token request headers when env is configured', async () => {
      process.env.GH_TOKEN = 'secret-token'
      const { initAutoUpdater } = await loadModule()
      initAutoUpdater(() => defaultSettings as import('../../shared/ipc').AppSettings)

      expect(mockAutoUpdater.requestHeaders).toEqual({
        Authorization: 'Bearer secret-token'
      })
      delete process.env.GH_TOKEN
    })

    it('registers updater event handlers and broadcasts to windows', async () => {
      const { initAutoUpdater } = await loadModule()
      initAutoUpdater(() => ({
        ...defaultSettings,
        autoDownloadUpdates: true
      } as import('../../shared/ipc').AppSettings))

      expect(mockAutoUpdater.on).toHaveBeenCalledWith('checking-for-update', expect.any(Function))
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function))
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('update-not-available', expect.any(Function))
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('download-progress', expect.any(Function))
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function))
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function))

      eventHandlers['checking-for-update']!()
      expect(mockSend).toHaveBeenCalledWith('gitfreddo:update-event', { type: 'checking' })

      eventHandlers['update-available']!({ version: '1.0.0', releaseNotes: 'Notes' })
      expect(mockSend).toHaveBeenCalledWith(
        'gitfreddo:update-event',
        expect.objectContaining({ type: 'available', version: '1.0.0' })
      )
      expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled()

      eventHandlers['update-not-available']!({ version: '0.2.8' })
      expect(mockSend).toHaveBeenCalledWith('gitfreddo:update-event', {
        type: 'not-available',
        version: '0.2.8'
      })

      eventHandlers['download-progress']!({ percent: 42 })
      expect(mockSend).toHaveBeenCalledWith('gitfreddo:update-event', {
        type: 'progress',
        percent: 42
      })

      eventHandlers['update-downloaded']!({ version: '1.0.0' })
      expect(mockSend).toHaveBeenCalledWith('gitfreddo:update-event', {
        type: 'downloaded',
        version: '1.0.0'
      })

      eventHandlers['error']!(new Error('network failed'))
      expect(mockSend).toHaveBeenCalledWith(
        'gitfreddo:update-event',
        expect.objectContaining({ type: 'error' })
      )
    })

    it('broadcasts download errors from update-available handler', async () => {
      mockAutoUpdater.downloadUpdate.mockRejectedValueOnce(new Error('download failed'))
      const { initAutoUpdater } = await loadModule()
      initAutoUpdater(() => ({
        ...defaultSettings,
        autoDownloadUpdates: true
      } as import('../../shared/ipc').AppSettings))

      eventHandlers['update-available']!({ version: '1.0.0', releaseNotes: undefined })
      await Promise.resolve()
      await Promise.resolve()

      expect(mockSend).toHaveBeenCalledWith('gitfreddo:update-event', {
        type: 'error',
        message: 'download failed'
      })
    })

    it('does not auto-download when setting is disabled', async () => {
      const { initAutoUpdater } = await loadModule()
      initAutoUpdater(() => defaultSettings as import('../../shared/ipc').AppSettings)

      eventHandlers['update-available']!({ version: '1.0.0', releaseNotes: undefined })
      expect(mockAutoUpdater.downloadUpdate).not.toHaveBeenCalled()
    })
  })

  describe('scheduleStartupCheck', () => {
    it('checks for updates after the startup delay', async () => {
      vi.useFakeTimers()
      const { initAutoUpdater } = await loadModule()
      initAutoUpdater(() => ({
        ...defaultSettings,
        checkForUpdatesOnStartup: true
      } as import('../../shared/ipc').AppSettings))

      await vi.advanceTimersByTimeAsync(10_000)
      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled()
    })

    it('clears a pending startup timer when rescheduled', async () => {
      vi.useFakeTimers()
      const { initAutoUpdater, scheduleStartupCheck } = await loadModule()
      initAutoUpdater(() => ({
        ...defaultSettings,
        checkForUpdatesOnStartup: true
      } as import('../../shared/ipc').AppSettings))

      scheduleStartupCheck(() => ({
        ...defaultSettings,
        checkForUpdatesOnStartup: false
      } as import('../../shared/ipc').AppSettings))

      await vi.advanceTimersByTimeAsync(10_000)
      expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled()
    })
  })

  describe('public API', () => {
    it('checks for updates and returns the app version', async () => {
      const { initAutoUpdater, checkForUpdates, getAppVersion } = await loadModule()
      initAutoUpdater(() => defaultSettings as import('../../shared/ipc').AppSettings)

      await checkForUpdates()
      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled()
      expect(getAppVersion()).toBe('0.2.8')
    })

    it('downloads and installs updates when enabled', async () => {
      const { initAutoUpdater, downloadUpdate, installUpdate } = await loadModule()
      initAutoUpdater(() => defaultSettings as import('../../shared/ipc').AppSettings)

      await downloadUpdate()
      installUpdate()

      expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled()
      expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalled()
    })

    it('no-ops download and install when disabled', async () => {
      isPackaged = false
      const { initAutoUpdater, downloadUpdate, installUpdate } = await loadModule()
      initAutoUpdater(() => defaultSettings as import('../../shared/ipc').AppSettings)

      await downloadUpdate()
      installUpdate()

      expect(mockAutoUpdater.downloadUpdate).not.toHaveBeenCalled()
      expect(mockAutoUpdater.quitAndInstall).not.toHaveBeenCalled()
    })
  })
})
