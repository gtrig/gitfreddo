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
    await saveSettings({ recentRepos: ['/tmp/a'], theme: 'mint' })
    await saveSettings({ pollIntervalMs: 9000 })

    const settings = await loadSettings()
    expect(settings.recentRepos).toEqual(['/tmp/a'])
    expect(settings.theme).toBe('mint')
    expect(settings.pollIntervalMs).toBe(9000)
  })

  it('serializes concurrent saves so both patches survive', async () => {
    const { saveSettings, loadSettings } = await loadModule()
    await saveSettings({ recentRepos: ['/tmp/seed'] })

    await Promise.all([
      saveSettings({ theme: 'paper' }),
      saveSettings({ editorCommand: 'code' })
    ])

    const settings = await loadSettings()
    expect(settings.recentRepos).toEqual(['/tmp/seed'])
    expect(settings.theme).toBe('paper')
    expect(settings.editorCommand).toBe('code')
  })

  it('writes settings atomically without leaving a temp file', async () => {
    const { saveSettings } = await loadModule()
    await saveSettings({ theme: 'dark' })

    const tmpPath = join(settingsDir, 'settings.json.tmp')
    await expect(access(tmpPath)).rejects.toThrow()

    const raw = await readFile(join(settingsDir, 'settings.json'), 'utf8')
    expect(JSON.parse(raw).theme).toBe('dark')
  })

  it('logs a warning when settings.json is invalid JSON', async () => {
    await writeFile(join(settingsDir, 'settings.json'), '{not json', 'utf8')
    const { loadSettings } = await loadModule()

    const settings = await loadSettings()
    expect(settings.theme).toBe('dark')
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
})

describe('nextRecentRepos', () => {
  it('prepends a repo and keeps at most ten entries', async () => {
    const { nextRecentRepos } = await import('./settings')
    const initial = Array.from({ length: 10 }, (_, index) => `/tmp/repo-${index}`)
    expect(nextRecentRepos(initial, '/tmp/new')).toEqual(['/tmp/new', ...initial.slice(0, 9)])
    expect(nextRecentRepos(['/tmp/a', '/tmp/b'], '/tmp/a')).toEqual(['/tmp/a', '/tmp/b'])
  })
})
