import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { FIXTURE_REPO } from '../playwright.config'

const mainPath = resolve('out/main/index.js')
const createFixtureScript = resolve('scripts/create-minimal-repo.sh')

function seedWorkspaceSettings(settingsDir: string, repoPath: string): void {
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
        pullRebase: false
      },
      null,
      2
    )
  )
}

test.describe('app smoke', () => {
  test.beforeAll(() => {
    execFileSync('bash', [createFixtureScript], { stdio: 'inherit' })
  })

  test('connects to fixture repo and shows main branch', async () => {
    const settingsDir = mkdtempSync(join(tmpdir(), 'gitfreddo-e2e-settings-'))
    seedWorkspaceSettings(settingsDir, FIXTURE_REPO)

    const electronApp = await electron.launch({
      args: [mainPath],
      env: {
        ...process.env,
        NO_SANDBOX: '1',
        GITFREDDO_SETTINGS_DIR: settingsDir
      }
    })

    try {
      const page = await electronApp.firstWindow()
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('button', { name: 'main', exact: true })).toBeVisible({
        timeout: 15_000
      })
    } finally {
      await electronApp.close()
    }
  })
})
