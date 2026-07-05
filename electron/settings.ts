import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import type { AppSettings } from '../shared/ipc'
import { normalizeAppTheme } from '../shared/ipc'
import { getAppDataDir } from './paths'

const SETTINGS_DIR = getAppDataDir()
const SETTINGS_PATH = join(SETTINGS_DIR, 'settings.json')

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  locale: 'en',
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
  aiSystemInstructions: '',
  aiCommitInstructions: '',
  aiStashInstructions: '',
  aiConflictInstructions: '',
  githubLogin: '',
  githubConnectedAt: null,
  pullRebase: false,
  submoduleRecursion: 'on-demand',
  pushSubmoduleRecursion: 'check',
  diffViewMode: 'unified',
  uiZoomFactor: 1,
  updateChannel: 'stable',
  autoDownloadUpdates: false,
  checkForUpdatesOnStartup: true
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
      aiSystemInstructions: parsed.aiSystemInstructions ?? '',
      aiCommitInstructions: parsed.aiCommitInstructions ?? '',
      aiStashInstructions: parsed.aiStashInstructions ?? '',
      aiConflictInstructions: parsed.aiConflictInstructions ?? '',
      githubLogin: parsed.githubLogin ?? '',
      githubConnectedAt: parsed.githubConnectedAt ?? null,
      pullRebase: Boolean(parsed.pullRebase),
      submoduleRecursion:
        parsed.submoduleRecursion === 'always' || parsed.submoduleRecursion === 'none'
          ? parsed.submoduleRecursion
          : 'on-demand',
      pushSubmoduleRecursion:
        parsed.pushSubmoduleRecursion === 'no' || parsed.pushSubmoduleRecursion === 'on-demand'
          ? parsed.pushSubmoduleRecursion
          : 'check',
      diffViewMode:
        parsed.diffViewMode === 'split' || parsed.diffViewMode === 'word'
          ? parsed.diffViewMode
          : 'unified',
      locale: parsed.locale === 'el' ? 'el' : 'en',
      theme: normalizeAppTheme(parsed.theme),
      uiZoomFactor:
        typeof parsed.uiZoomFactor === 'number' && Number.isFinite(parsed.uiZoomFactor)
          ? Math.min(2, Math.max(0.5, Math.round(parsed.uiZoomFactor * 10) / 10))
          : DEFAULT_SETTINGS.uiZoomFactor,
      updateChannel: parsed.updateChannel === 'beta' ? 'beta' : 'stable',
      autoDownloadUpdates: Boolean(parsed.autoDownloadUpdates),
      checkForUpdatesOnStartup:
        parsed.checkForUpdatesOnStartup === undefined
          ? DEFAULT_SETTINGS.checkForUpdatesOnStartup
          : Boolean(parsed.checkForUpdatesOnStartup)
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
