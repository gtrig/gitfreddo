import { describe, expect, it, vi } from 'vitest'
import { join } from 'path'
import { resolveAppDataDir } from './paths'

describe('resolveAppDataDir', () => {
  it('uses macOS Application Support', () => {
    expect(resolveAppDataDir('darwin', '/Users/test')).toBe(
      '/Users/test/Library/Application Support/gitfreddo'
    )
  })

  it('uses Linux XDG config dir', () => {
    expect(resolveAppDataDir('linux', '/home/test')).toBe('/home/test/.config/gitfreddo')
  })

  it('uses Windows AppData Roaming', () => {
    expect(resolveAppDataDir('win32', 'C:\\Users\\test')).toBe(
      join('C:\\Users\\test', 'AppData', 'Roaming', 'gitfreddo')
    )
  })
})

describe('getAppDataDir', () => {
  it('honors GITFREDDO_SETTINGS_DIR override', async () => {
    vi.stubEnv('GITFREDDO_SETTINGS_DIR', '/custom/settings')
    vi.resetModules()
    const { getAppDataDir } = await import('./paths')
    expect(getAppDataDir()).toBe('/custom/settings')
    vi.unstubAllEnvs()
  })
})
