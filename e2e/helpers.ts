import { _electron as electron, type ElectronApplication, type Page, test } from '@playwright/test'
import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'

export const mainPath = resolve('out/main/index.js')

export const E2E_FIXTURE_PATHS = {
  minimalRepo: resolve('test/fixtures/minimal-repo'),
  pushRepo: resolve('test/fixtures/push-repo'),
  pushRemote: resolve('test/fixtures/push-remote.git'),
  pushBackupRemote: resolve('test/fixtures/push-backup.git'),
  rebaseRepo: resolve('test/fixtures/rebase-repo'),
  mergeConflictRepo: resolve('test/fixtures/merge-conflict-repo')
} as const

export function removePath(path: string): void {
  try {
    rmSync(path, { recursive: true, force: true })
  } catch {
    // Best-effort cleanup — ignore failures from races or permissions.
  }
}

export async function removePathAsync(path: string, attempts = 8): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      rmSync(path, { recursive: true, force: true })
      if (!existsSync(path)) return
    } catch {
      // Retry while the Electron process releases file handles.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50 * (attempt + 1)))
  }
}

export function removePaths(...paths: string[]): void {
  for (const path of paths) {
    removePath(path)
  }
}

export function useFixture(scriptPath: string, cleanupPaths: string[]): void {
  test.beforeAll(() => {
    runFixtureScript(scriptPath)
  })
  test.afterAll(() => {
    removePaths(...cleanupPaths)
  })
}

export interface WorkspaceSettings {
  theme?: string
  locale?: string
  gitBinaryPath?: string
  recentRepos?: string[]
  openRepoTabs?: string[]
  activeRepoTab?: string | null
  pollIntervalMs?: number
  defaultRemote?: string
  logMaxCount?: number
  startupModalHiddenUntil?: number | null
  startupModalHiddenForVersion?: string | null
}

export function seedWorkspaceSettings(settingsDir: string, repoPath: string, overrides: WorkspaceSettings = {}): void {
  mkdirSync(settingsDir, { recursive: true })
  writeFileSync(
    join(settingsDir, 'settings.json'),
    JSON.stringify(
      {
        theme: 'black',
        locale: 'en',
        gitBinaryPath: 'git',
        recentRepos: [repoPath],
        openRepoTabs: [repoPath],
        activeRepoTab: repoPath,
        pollIntervalMs: 5000,
        defaultRemote: 'origin',
        editorCommand: '',
        logMaxCount: 500,
        aiEnabled: false,
        aiProvider: 'local',
        aiBaseUrl: 'http://localhost:1234',
        aiApiKey: '',
        aiModel: '',
        diffViewMode: 'unified',
        pullMode: 'merge',
        submoduleRecursion: 'on-demand',
        pushSubmoduleRecursion: 'no',
        updateChannel: 'stable',
        autoDownloadUpdates: false,
        checkForUpdatesOnStartup: false,
        ...overrides
      },
      null,
      2
    )
  )
}

export async function launchApp(settingsDir: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [mainPath, '--no-sandbox'],
    env: {
      ...process.env,
      NO_SANDBOX: '1',
      GITFREDDO_E2E: '1',
      GITFREDDO_SETTINGS_DIR: settingsDir
    }
  })
}

/** Invoke git IPC on the app's active repo, naming it explicitly like the renderer does. */
export async function invokeGitfreddo<T>(page: Page, method: string, params?: unknown): Promise<T> {
  return page.evaluate(
    async ({ method, params }) => {
      const repoPath = (await window.gitfreddo.getWorkspacePath()) ?? undefined
      return window.gitfreddo.invoke(method, params, repoPath) as T
    },
    { method, params }
  )
}

export function runFixtureScript(scriptPath: string): void {
  execFileSync('bash', [scriptPath], { stdio: 'inherit' })
}

/**
 * Wait until main has `repoPath` connected (the renderer restores the session tab
 * on startup). Under parallel load this takes several seconds, so a fixed delay
 * is not enough. Retries through the reload the renderer does right at startup.
 */
export async function waitForRepoConnected(
  page: Page,
  repoPath: string,
  timeoutMs = 30_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastSeen: string[] = []
  while (Date.now() < deadline) {
    try {
      lastSeen = await page.evaluate(() => window.gitfreddo.listWorkspaces())
      if (lastSeen.some((path) => path === repoPath || realpathOrSelf(path) === realpathOrSelf(repoPath))) {
        return
      }
    } catch {
      // Execution context replaced by the startup navigation; try again.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
  }
  throw new Error(
    `Repository ${repoPath} was not connected within ${timeoutMs}ms (connected: ${JSON.stringify(lastSeen)})`
  )
}

function realpathOrSelf(path: string): string {
  try {
    return realpathSync(path)
  } catch {
    return path
  }
}

export async function runElectronTest(
  options: {
    settingsPrefix: string
    repoPath: string
    settings?: WorkspaceSettings
    waitMs?: number
  },
  run: (page: Page) => Promise<void>
): Promise<void> {
  const settingsDir = mkdtempSync(join(tmpdir(), options.settingsPrefix))
  seedWorkspaceSettings(settingsDir, options.repoPath, options.settings)
  const electronApp = await launchApp(settingsDir)
  try {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await waitForRepoConnected(page, options.repoPath)
    if (options.waitMs) {
      await page.waitForTimeout(options.waitMs)
    }
    await run(page)
  } finally {
    await electronApp.close()
    await removePathAsync(settingsDir)
  }
}
