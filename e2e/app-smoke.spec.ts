import { test, expect } from '@playwright/test'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { FIXTURE_REPO } from '../playwright.config'
import { launchApp, runFixtureScript, seedWorkspaceSettings } from './helpers'

const createFixtureScript = resolve('scripts/create-minimal-repo.sh')

test.describe('app smoke', () => {
  test.beforeAll(() => {
    runFixtureScript(createFixtureScript)
  })

  test('connects to fixture repo and shows main branch', async () => {
    const settingsDir = mkdtempSync(join(tmpdir(), 'gitfreddo-e2e-settings-'))
    seedWorkspaceSettings(settingsDir, FIXTURE_REPO)

    const electronApp = await launchApp(settingsDir)

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
