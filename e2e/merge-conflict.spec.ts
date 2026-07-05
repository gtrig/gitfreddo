import { test, expect } from '@playwright/test'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { invokeGitfreddo, launchApp, runFixtureScript, seedWorkspaceSettings } from './helpers'

const conflictFixtureScript = resolve('scripts/create-merge-conflict-fixture.sh')
const CONFLICT_REPO = resolve('test/fixtures/merge-conflict-repo')

test.describe('merge conflict', () => {
  test.beforeAll(() => {
    runFixtureScript(conflictFixtureScript)
  })

  test('reports merge conflicts after a failed merge', async () => {
    const settingsDir = mkdtempSync(join(tmpdir(), 'gitfreddo-e2e-conflict-'))
    seedWorkspaceSettings(settingsDir, CONFLICT_REPO)

    const electronApp = await launchApp(settingsDir)
    try {
      const page = await electronApp.firstWindow()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      const mergeStatus = await invokeGitfreddo<{ conflictedPaths: string[] }>(page, 'merge.status')
      expect(mergeStatus.conflictedPaths.length).toBeGreaterThan(0)
    } finally {
      await electronApp.close()
    }
  })
})
