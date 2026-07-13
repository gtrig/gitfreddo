import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, writeFile, access } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

vi.mock('./git/log-bus', () => ({
  emitLog: vi.fn()
}))

import { emitLog } from './git/log-bus'

describe('settings persistence', () => {
  let settingsDir = ''

  beforeEach(async () => {
    settingsDir = await mkdtemp(join(tmpdir(), 'gitfreddo-settings-'))
    vi.stubEnv('GITFREDDO_SETTINGS_DIR', settingsDir)
    vi.resetModules()
    vi.mocked(emitLog).mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  async function loadModule() {
    return import('./settings')
  }

  it('merges partial patches without dropping unrelated fields', async () => {
    const { saveSettings, loadSettings } = await loadModule()
    await saveSettings({ recentRepos: ['/tmp/a'], theme: 'iced-matcha' })
    await saveSettings({ pollIntervalMs: 9000 })

    const settings = await loadSettings()
    expect(settings.recentRepos).toEqual(['/tmp/a'])
    expect(settings.theme).toBe('iced-matcha')
    expect(settings.pollIntervalMs).toBe(9000)
  })

  it('serializes concurrent saves so both patches survive', async () => {
    const { saveSettings, loadSettings } = await loadModule()
    await saveSettings({ recentRepos: ['/tmp/seed'] })

    await Promise.all([
      saveSettings({ theme: 'iced-latte' }),
      saveSettings({ editorCommand: 'code' })
    ])

    const settings = await loadSettings()
    expect(settings.recentRepos).toEqual(['/tmp/seed'])
    expect(settings.theme).toBe('iced-latte')
    expect(settings.editorCommand).toBe('code')
  })

  it('writes settings atomically without leaving a temp file', async () => {
    const { saveSettings } = await loadModule()
    await saveSettings({ theme: 'black' })

    const tmpPath = join(settingsDir, 'settings.json.tmp')
    await expect(access(tmpPath)).rejects.toThrow()

    const raw = await readFile(join(settingsDir, 'settings.json'), 'utf8')
    expect(JSON.parse(raw).theme).toBe('black')
  })

  it('logs a warning when settings.json is invalid JSON', async () => {
    await writeFile(join(settingsDir, 'settings.json'), '{not json', 'utf8')
    const { loadSettings } = await loadModule()

    const settings = await loadSettings()
    expect(settings.theme).toBe('black')
    expect(emitLog).toHaveBeenCalledWith(
      'app',
      'warn',
      'Failed to load settings; using defaults',
      expect.any(String)
    )
  })

  it('does not log when settings.json is missing', async () => {
    const { loadSettings } = await loadModule()
    const settings = await loadSettings()

    expect(settings.recentRepos).toEqual([])
    expect(emitLog).not.toHaveBeenCalled()
  })

  it('normalizes legacy and partial settings fields', async () => {
    await writeFile(
      join(settingsDir, 'settings.json'),
      JSON.stringify({
        aiProvider: 'api',
        aiBaseUrl: 'http://localhost:9999',
        bitbucketAuthType: 'invalid',
        submoduleRecursion: 'bogus',
        pushSubmoduleRecursion: 'no',
        diffViewMode: 'split',
        locale: 'el',
        uiZoomFactor: 9,
        updateChannel: 'beta',
        startupModalHiddenUntil: 'not-a-number',
        startupModalHiddenForVersion: ' 1.2.3 '
      }),
      'utf8'
    )

    const { loadSettings } = await loadModule()
    const settings = await loadSettings()

    expect(settings.aiEnabled).toBe(false)
    expect(settings.aiBaseUrl).toBe('http://localhost:9999')
    expect(settings.aiProvider).toBe('api')
    expect(settings.bitbucketAuthType).toBeNull()
    expect(settings.submoduleRecursion).toBe('on-demand')
    expect(settings.pushSubmoduleRecursion).toBe('no')
    expect(settings.diffViewMode).toBe('split')
    expect(settings.locale).toBe('el')
    expect(settings.uiZoomFactor).toBe(2)
    expect(settings.updateChannel).toBe('beta')
    expect(settings.startupModalHiddenUntil).toBeNull()
    expect(settings.startupModalHiddenForVersion).toBe('1.2.3')
  })
})

describe('nextRecentRepos', () => {
  it('prepends a repo and keeps at most ten entries', async () => {
    const { nextRecentRepos } = await import('./settings')
    const initial = Array.from({ length: 10 }, (_, index) => `/tmp/repo-${index}`)
    expect(nextRecentRepos(initial, '/tmp/new')).toEqual(['/tmp/new', ...initial.slice(0, 9)])
    expect(nextRecentRepos(['/tmp/a', '/tmp/b'], '/tmp/a')).toEqual(['/tmp/a', '/tmp/b'])
  })
})
