import { test, expect } from '@playwright/test'
import { resolve } from 'path'
import { E2E_FIXTURE_PATHS, invokeGitfreddo, runElectronTest, useFixture } from './helpers'

const conflictFixtureScript = resolve('scripts/create-merge-conflict-fixture.sh')

test.describe('merge conflict', () => {
  useFixture(conflictFixtureScript, [E2E_FIXTURE_PATHS.mergeConflictRepo])

  test('reports merge conflicts after a failed merge', async () => {
    await runElectronTest(
      {
        settingsPrefix: 'gitfreddo-e2e-conflict-',
        repoPath: E2E_FIXTURE_PATHS.mergeConflictRepo,
        waitMs: 2000
      },
      async (page) => {
        const mergeStatus = await invokeGitfreddo<{ conflictedPaths: string[] }>(page, 'merge.status')
        expect(mergeStatus.conflictedPaths.length).toBeGreaterThan(0)
      }
    )
  })
})
