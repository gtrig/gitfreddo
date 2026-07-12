import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyUpdateChannel } from '../../shared/update'

const mockAutoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  allowPrerelease: false,
  on: vi.fn(),
  checkForUpdates: vi.fn(async () => null),
  downloadUpdate: vi.fn(async () => null),
  quitAndInstall: vi.fn()
}

vi.mock('electron-updater', () => ({
  default: { autoUpdater: mockAutoUpdater }
}))

vi.mock('electron', () => ({
  app: { isPackaged: true, getVersion: () => '0.2.8' },
  BrowserWindow: {
    getAllWindows: () => []
  }
}))

vi.mock('../git/log-bus', () => ({
  emitLog: vi.fn()
}))

describe('applyUpdaterSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAutoUpdater.autoDownload = false
    mockAutoUpdater.allowPrerelease = false
  })

  it('maps settings to autoUpdater flags', async () => {
    const { applyUpdaterSettings, initAutoUpdater } = await import('./auto-update')
    initAutoUpdater(() => ({
      autoDownloadUpdates: true,
      updateChannel: 'beta',
      checkForUpdatesOnStartup: false
    } as import('../../shared/ipc').AppSettings))

    applyUpdaterSettings({
      autoDownloadUpdates: true,
      updateChannel: 'beta',
      checkForUpdatesOnStartup: false
    } as import('../../shared/ipc').AppSettings)

    expect(mockAutoUpdater.autoDownload).toBe(true)
    expect(mockAutoUpdater.allowPrerelease).toBe(applyUpdateChannel('beta').allowPrerelease)
  })

  it('checks for updates and returns the app version', async () => {
    const { initAutoUpdater, checkForUpdates, getAppVersion } = await import('./auto-update')
    initAutoUpdater(() => ({
      autoDownloadUpdates: false,
      updateChannel: 'stable',
      checkForUpdatesOnStartup: false
    } as import('../../shared/ipc').AppSettings))

    await checkForUpdates()
    expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled()
    expect(getAppVersion()).toBe('0.2.8')
  })
})
