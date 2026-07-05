import { test, expect } from '@playwright/test'
import { resolve } from 'path'
import { E2E_FIXTURE_PATHS, invokeGitfreddo, runElectronTest, useFixture } from './helpers'

const rebaseFixtureScript = resolve('scripts/create-rebase-fixture.sh')

test.describe('interactive rebase', () => {
  useFixture(rebaseFixtureScript, [E2E_FIXTURE_PATHS.rebaseRepo])

  test('starts an interactive rebase on recent commits', async () => {
    await runElectronTest(
      {
        settingsPrefix: 'gitfreddo-e2e-rebase-',
        repoPath: E2E_FIXTURE_PATHS.rebaseRepo,
        waitMs: 2000
      },
      async (page) => {
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
      }
    )
  })
})
