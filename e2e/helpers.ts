import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { execFileSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { resolve } from 'path'

export const mainPath = resolve('out/main/index.js')

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
}

export function seedWorkspaceSettings(settingsDir: string, repoPath: string, overrides: WorkspaceSettings = {}): void {
  mkdirSync(settingsDir, { recursive: true })
  writeFileSync(
    join(settingsDir, 'settings.json'),
    JSON.stringify(
      {
        theme: 'dark',
        locale: 'en',
        gitBinaryPath: 'git',
        recentRepos: [repoPath],
        openRepoTabs: [repoPath],
        activeRepoTab: repoPath,
        pollIntervalMs: 5000,
        defaultRemote: 'origin',
        editorCommand: '',
        logMaxCount: 500,
        aiProvider: 'local',
        aiBaseUrl: 'http://localhost:1234',
        aiApiKey: '',
        aiModel: '',
        diffViewMode: 'unified',
        pullRebase: false,
        ...overrides
      },
      null,
      2
    )
  )
}

export async function launchApp(settingsDir: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [mainPath],
    env: {
      ...process.env,
      NO_SANDBOX: '1',
      GITFREDDO_SETTINGS_DIR: settingsDir
    }
  })
}

export async function invokeGitfreddo<T>(page: Page, method: string, params?: unknown): Promise<T> {
  return page.evaluate(
    async ({ method, params }) => {
      return window.gitfreddo.invoke(method, params) as T
    },
    { method, params }
  )
}

export function runFixtureScript(scriptPath: string): void {
  execFileSync('bash', [scriptPath], { stdio: 'inherit' })
}
