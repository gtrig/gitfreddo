import { readFile, writeFile, mkdir } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import type { AppSettings } from '../shared/ipc'
import { normalizeAppTheme } from '../shared/ipc'

const SETTINGS_DIR = join(homedir(), '.config', 'gitfredo')
const SETTINGS_PATH = join(SETTINGS_DIR, 'settings.json')

const DEFAULT_SETTINGS: AppSettings = {
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
  githubLogin: '',
  githubConnectedAt: null
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
      logMaxCount: parsed.logMaxCount ?? DEFAULT_SETTINGS.logMaxCount,
      aiProvider: parsed.aiProvider === 'api' ? 'api' : 'local',
      aiBaseUrl: parsed.aiBaseUrl ?? DEFAULT_SETTINGS.aiBaseUrl,
      aiApiKey: parsed.aiApiKey ?? '',
      aiModel: parsed.aiModel ?? '',
      githubLogin: parsed.githubLogin ?? '',
      githubConnectedAt: parsed.githubConnectedAt ?? null,
      theme: normalizeAppTheme(parsed.theme)
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
