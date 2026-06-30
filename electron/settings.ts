import { readFile, writeFile, mkdir } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import type { AppSettings } from '../shared/ipc'

const SETTINGS_DIR = join(homedir(), '.config', 'gitfredo')
const SETTINGS_PATH = join(SETTINGS_DIR, 'settings.json')

const DEFAULT_SETTINGS: AppSettings = {
  gitBinaryPath: 'git',
  recentRepos: [],
  openRepoTabs: [],
  activeRepoTab: null,
  pollIntervalMs: 5000,
  defaultRemote: 'origin',
  editorCommand: '',
  logMaxCount: 500
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, 'utf8')
    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as AppSettings
    return {
      ...parsed,
      gitBinaryPath: parsed.gitBinaryPath ?? DEFAULT_SETTINGS.gitBinaryPath,
      openRepoTabs: parsed.openRepoTabs ?? [],
      activeRepoTab: parsed.activeRepoTab ?? null,
      pollIntervalMs: parsed.pollIntervalMs ?? DEFAULT_SETTINGS.pollIntervalMs,
      defaultRemote: parsed.defaultRemote ?? DEFAULT_SETTINGS.defaultRemote,
      editorCommand: parsed.editorCommand ?? '',
      logMaxCount: parsed.logMaxCount ?? DEFAULT_SETTINGS.logMaxCount
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings()
  const next = { ...current, ...patch }
  await mkdir(SETTINGS_DIR, { recursive: true })
  await writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf8')
  return next
}

export function addRecentRepo(settings: AppSettings, repoPath: string): AppSettings {
  const filtered = settings.recentRepos.filter((p) => p !== repoPath)
  return {
    ...settings,
    recentRepos: [repoPath, ...filtered].slice(0, 10)
  }
}
