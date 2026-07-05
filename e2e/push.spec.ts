import { test, expect } from '@playwright/test'
import { resolve } from 'path'
import { E2E_FIXTURE_PATHS, invokeGitfreddo, runElectronTest, useFixture } from './helpers'

const pushFixtureScript = resolve('scripts/create-push-fixture.sh')

test.describe('push', () => {
  useFixture(pushFixtureScript, [E2E_FIXTURE_PATHS.pushRepo, E2E_FIXTURE_PATHS.pushRemote])

  test('pushes an ahead commit via IPC', async () => {
    await runElectronTest(
      {
        settingsPrefix: 'gitfreddo-e2e-push-',
        repoPath: E2E_FIXTURE_PATHS.pushRepo,
        waitMs: 2000
      },
      async (page) => {
        await invokeGitfreddo(page, 'push', { remote: 'origin', branch: 'main' })
        const branches = await invokeGitfreddo<Array<{ ahead: number; isCurrent: boolean }>>(
          page,
          'branch.list'
        )
        const current = branches.find((branch) => branch.isCurrent)
        expect(current?.ahead ?? 0).toBe(0)
      }
    )
  })
})
