import { test, expect } from '@playwright/test'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { invokeGitfreddo, launchApp, runFixtureScript, seedWorkspaceSettings } from './helpers'

const pushFixtureScript = resolve('scripts/create-push-fixture.sh')
const PUSH_REPO = resolve('test/fixtures/push-repo')

test.describe('push', () => {
  test.beforeAll(() => {
    runFixtureScript(pushFixtureScript)
  })

  test('pushes an ahead commit via IPC', async () => {
    const settingsDir = mkdtempSync(join(tmpdir(), 'gitfreddo-e2e-push-'))
    seedWorkspaceSettings(settingsDir, PUSH_REPO)

    const electronApp = await launchApp(settingsDir)
    try {
      const page = await electronApp.firstWindow()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      await invokeGitfreddo(page, 'push', { remote: 'origin', branch: 'main' })
      const branches = await invokeGitfreddo<Array<{ ahead: number; isCurrent: boolean }>>(
        page,
        'branch.list'
      )
      const current = branches.find((branch) => branch.isCurrent)
      expect(current?.ahead ?? 0).toBe(0)
    } finally {
      await electronApp.close()
    }
  })
})
