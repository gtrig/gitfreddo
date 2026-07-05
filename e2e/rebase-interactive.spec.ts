import { test, expect } from '@playwright/test'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { invokeGitfreddo, launchApp, runFixtureScript, seedWorkspaceSettings } from './helpers'

const rebaseFixtureScript = resolve('scripts/create-rebase-fixture.sh')
const REBASE_REPO = resolve('test/fixtures/rebase-repo')

test.describe('interactive rebase', () => {
  test.beforeAll(() => {
    runFixtureScript(rebaseFixtureScript)
  })

  test('starts an interactive rebase on recent commits', async () => {
    const settingsDir = mkdtempSync(join(tmpdir(), 'gitfreddo-e2e-rebase-'))
    seedWorkspaceSettings(settingsDir, REBASE_REPO)

    const electronApp = await launchApp(settingsDir)
    try {
      const page = await electronApp.firstWindow()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      const graph = await invokeGitfreddo<{ commits: { hash: string; subject: string }[] }>(
        page,
        'log.graph',
        { maxCount: 10 }
      )
      const chronological = [...graph.commits].reverse()
      const baseHash = chronological[0]?.hash
      expect(baseHash).toBeTruthy()
      const todoLines = chronological.slice(1).map((commit) => `pick ${commit.hash} ${commit.subject}`)
      expect(todoLines.length).toBeGreaterThan(0)

      await invokeGitfreddo(page, 'rebase.interactive', { baseHash, todoLines })
      let working = await invokeGitfreddo<{ rebaseInProgress: boolean }>(page, 'working.status')
      if (working.rebaseInProgress) {
        await invokeGitfreddo(page, 'rebase.abort')
        working = await invokeGitfreddo<{ rebaseInProgress: boolean }>(page, 'working.status')
      }
      expect(working.rebaseInProgress).toBe(false)
    } finally {
      await electronApp.close()
    }
  })
})
