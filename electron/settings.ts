import { copyFile, readFile, writeFile, mkdir, rename } from 'fs/promises'
import { join } from 'path'
import type { AppSettings } from '../shared/ipc'
import { normalizeAppTheme } from '../shared/ipc'
import { settingsForDisk } from '../shared/settings-secrets'
import { getAppDataDir } from './paths'
import { emitLog } from './git/log-bus'
import { loadAiApiKey, saveAiApiKey } from './ai/api-key-store'

const SETTINGS_DIR = getAppDataDir()
const SETTINGS_PATH = join(SETTINGS_DIR, 'settings.json')
const SETTINGS_TMP_PATH = join(SETTINGS_DIR, 'settings.json.tmp')

const DEFAULT_SETTINGS: AppSettings = {
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
  aiAnalyzeInstructions: '',
  githubLogin: '',
  githubConnectedAt: null,
  githubSshKeyTitle: '',
  bitbucketLogin: '',
  bitbucketAuthLogin: '',
  bitbucketConnectedAt: null,
  bitbucketAuthType: null,
  bitbucketSshKeyTitle: '',
  gitlabLogin: '',
  gitlabConnectedAt: null,
  gitlabAuthType: null,
  gitlabSshKeyTitle: '',
  gitlabHost: 'gitlab.com',
  pullMode: 'merge',
  submoduleRecursion: 'on-demand',
  pushSubmoduleRecursion: 'no',
  diffViewMode: 'unified',
  uiZoomFactor: 1,
  updateChannel: 'stable',
  autoDownloadUpdates: false,
  checkForUpdatesOnStartup: true,
  startupModalHiddenUntil: null,
  startupModalHiddenForVersion: null
}

let writeChain: Promise<void> = Promise.resolve()

function resolvePullMode(
  parsed: AppSettings & { pullRebase?: boolean }
): AppSettings['pullMode'] {
  if (parsed.pullMode === 'rebase' || parsed.pullMode === 'ff-only' || parsed.pullMode === 'merge') {
    return parsed.pullMode
  }
  return parsed.pullRebase ? 'rebase' : 'merge'
}

function normalizeSettings(parsed: AppSettings): AppSettings {
  return {
    ...parsed,
    gitBinaryPath: parsed.gitBinaryPath ?? DEFAULT_SETTINGS.gitBinaryPath,
    openRepoTabs: parsed.openRepoTabs ?? [],
    activeRepoTab: parsed.activeRepoTab ?? null,
    pollIntervalMs: parsed.pollIntervalMs ?? DEFAULT_SETTINGS.pollIntervalMs,
    defaultRemote: parsed.defaultRemote ?? DEFAULT_SETTINGS.defaultRemote,
    editorCommand: parsed.editorCommand ?? '',
    logMaxCount: parsed.logMaxCount ?? DEFAULT_SETTINGS.logMaxCount,
    aiEnabled:
      parsed.aiEnabled !== undefined
        ? Boolean(parsed.aiEnabled)
        : Boolean((parsed.aiBaseUrl ?? DEFAULT_SETTINGS.aiBaseUrl)?.trim()),
    aiProvider: parsed.aiProvider === 'api' ? 'api' : 'local',
    aiBaseUrl: parsed.aiBaseUrl ?? DEFAULT_SETTINGS.aiBaseUrl,
    aiApiKey: parsed.aiApiKey ?? '',
    aiModel: parsed.aiModel ?? '',
    aiSystemInstructions: parsed.aiSystemInstructions ?? '',
    aiCommitInstructions: parsed.aiCommitInstructions ?? '',
    aiStashInstructions: parsed.aiStashInstructions ?? '',
    aiConflictInstructions: parsed.aiConflictInstructions ?? '',
    aiAnalyzeInstructions: parsed.aiAnalyzeInstructions ?? '',
    githubLogin: parsed.githubLogin ?? '',
    githubConnectedAt: parsed.githubConnectedAt ?? null,
    githubSshKeyTitle: parsed.githubSshKeyTitle ?? '',
    bitbucketLogin: parsed.bitbucketLogin ?? '',
    bitbucketAuthLogin: parsed.bitbucketAuthLogin ?? '',
    bitbucketConnectedAt: parsed.bitbucketConnectedAt ?? null,
    bitbucketAuthType:
      parsed.bitbucketAuthType === 'oauth' || parsed.bitbucketAuthType === 'app_password'
        ? parsed.bitbucketAuthType
        : null,
    bitbucketSshKeyTitle: parsed.bitbucketSshKeyTitle ?? '',
    gitlabLogin: parsed.gitlabLogin ?? '',
    gitlabConnectedAt: parsed.gitlabConnectedAt ?? null,
    gitlabAuthType:
      parsed.gitlabAuthType === 'oauth' || parsed.gitlabAuthType === 'pat'
        ? parsed.gitlabAuthType
        : null,
    gitlabSshKeyTitle: parsed.gitlabSshKeyTitle ?? '',
    gitlabHost: parsed.gitlabHost ?? DEFAULT_SETTINGS.gitlabHost,
    pullMode: resolvePullMode(parsed),
    submoduleRecursion:
      parsed.submoduleRecursion === 'always' || parsed.submoduleRecursion === 'none'
        ? parsed.submoduleRecursion
        : 'on-demand',
    pushSubmoduleRecursion:
      parsed.pushSubmoduleRecursion === 'check' || parsed.pushSubmoduleRecursion === 'on-demand'
        ? parsed.pushSubmoduleRecursion
        : 'no',
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
        : Boolean(parsed.checkForUpdatesOnStartup),
    startupModalHiddenUntil:
      typeof parsed.startupModalHiddenUntil === 'number' &&
      Number.isFinite(parsed.startupModalHiddenUntil)
        ? parsed.startupModalHiddenUntil
        : null,
    startupModalHiddenForVersion:
      typeof parsed.startupModalHiddenForVersion === 'string' &&
      parsed.startupModalHiddenForVersion.trim()
        ? parsed.startupModalHiddenForVersion.trim()
        : null
  }
}

/** Raw content we already copied aside, so repeated loads don't pile up backups. */
let backedUpCorruptContent: string | null = null

/** Copy an unreadable settings.json aside before a later save replaces it with defaults. */
async function backUpCorruptSettings(raw: string): Promise<void> {
  if (backedUpCorruptContent === raw) return
  const backupPath = `${SETTINGS_PATH}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`
  try {
    await copyFile(SETTINGS_PATH, backupPath)
    backedUpCorruptContent = raw
    emitLog('app', 'warn', 'Saved a copy of the unreadable settings file', backupPath)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    emitLog('app', 'warn', 'Could not back up the unreadable settings file', message)
  }
}

async function readSettingsFile(): Promise<AppSettings | null> {
  let raw: string
  try {
    raw = await readFile(SETTINGS_PATH, 'utf8')
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return null
    }
    const message = error instanceof Error ? error.message : String(error)
    emitLog('app', 'warn', 'Failed to load settings; using defaults', message)
    return null
  }
  try {
    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as AppSettings
    return normalizeSettings(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    emitLog('app', 'warn', 'Failed to load settings; using defaults', message)
    await backUpCorruptSettings(raw)
    return null
  }
}

async function writeSettingsFile(settings: AppSettings): Promise<void> {
  await mkdir(SETTINGS_DIR, { recursive: true })
  const payload = JSON.stringify(settingsForDisk(settings), null, 2)
  await writeFile(SETTINGS_TMP_PATH, payload, 'utf8')
  await rename(SETTINGS_TMP_PATH, SETTINGS_PATH)
}

/** Run a settings.json write after any queued ones, so writes never interleave. */
function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task)
  writeChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function hydrateAiApiKey(settings: AppSettings, inWriteChain = false): Promise<AppSettings> {
  const stored = await loadAiApiKey()
  if (stored?.trim()) {
    return { ...settings, aiApiKey: stored }
  }

  // Migrate legacy plaintext key from settings.json into the encrypted store.
  if (settings.aiApiKey.trim()) {
    try {
      await saveAiApiKey(settings.aiApiKey)
      const clearPlaintextKey = async () => {
        // Re-read so a save that ran meanwhile is not overwritten.
        const latest = (await readSettingsFile()) ?? settings
        await writeSettingsFile({ ...latest, aiApiKey: '' })
      }
      await (inWriteChain ? clearPlaintextKey() : enqueueWrite(clearPlaintextKey))
      return settings
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      emitLog('app', 'warn', 'Failed to migrate AI API key into OS encryption', message)
      return settings
    }
  }

  return { ...settings, aiApiKey: '' }
}

export async function loadSettings(): Promise<AppSettings> {
  const loaded = await readSettingsFile()
  return hydrateAiApiKey(loaded ?? { ...DEFAULT_SETTINGS })
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  return enqueueWrite(async () => {
    const current = await hydrateAiApiKey(
      (await readSettingsFile()) ?? { ...DEFAULT_SETTINGS },
      true
    )
    const next = normalizeSettings({ ...current, ...patch })
    if ('aiApiKey' in patch) {
      await saveAiApiKey(next.aiApiKey)
    }
    await writeSettingsFile(next)
    const stored = await loadAiApiKey()
    return { ...next, aiApiKey: stored?.trim() || '' }
  })
}

export function nextRecentRepos(recentRepos: readonly string[], repoPath: string): string[] {
  const filtered = recentRepos.filter((path) => path !== repoPath)
  return [repoPath, ...filtered].slice(0, 10)
}

export function addRecentRepo(settings: AppSettings, repoPath: string): AppSettings {
  return {
    ...settings,
    recentRepos: nextRecentRepos(settings.recentRepos, repoPath)
  }
}
