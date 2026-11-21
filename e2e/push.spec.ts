import { execFileSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { resolve } from 'path'
import { E2E_FIXTURE_PATHS, invokeGitfreddo, runElectronTest, useFixture } from './helpers'

const pushFixtureScript = resolve('scripts/create-push-fixture.sh')
/**
 * Keep the startup "Latest News" modal from covering the action bar. No version
 * pin: under the e2e launcher the app version isn't the package version.
 */
const hideStartupModal = {
  startupModalHiddenUntil: Date.now() + 24 * 60 * 60 * 1000,
  startupModalHiddenForVersion: null
}

const revParse = (gitDir: string, ref: string) =>
  execFileSync('git', ['--git-dir', gitDir, 'rev-parse', '--verify', '--quiet', ref], {
    encoding: 'utf8'
  }).trim()

const upstreamOf = (repo: string, branch: string) =>
  execFileSync('git', ['-C', repo, 'rev-parse', '--abbrev-ref', `${branch}@{upstream}`], {
    encoding: 'utf8'
  }).trim()

test.describe('push', () => {
  useFixture(pushFixtureScript, [
    E2E_FIXTURE_PATHS.pushRepo,
    E2E_FIXTURE_PATHS.pushRemote,
    E2E_FIXTURE_PATHS.pushBackupRemote
  ])

  test('pushes an ahead commit via IPC', async () => {
    await runElectronTest(
      {
        settingsPrefix: 'gitfreddo-e2e-push-',
        repoPath: E2E_FIXTURE_PATHS.pushRepo
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

  test('pushes to a second remote from the Push menu and keeps the upstream', async () => {
    await runElectronTest(
      {
        settingsPrefix: 'gitfreddo-e2e-push-backup-',
        repoPath: E2E_FIXTURE_PATHS.pushRepo,
        settings: hideStartupModal
      },
      async (page) => {
        await page.getByRole('button', { name: 'Choose remote' }).click()
        await page.getByRole('menuitem', { name: 'Push to backup' }).click()

        const localHead = execFileSync('git', ['-C', E2E_FIXTURE_PATHS.pushRepo, 'rev-parse', 'main'], {
          encoding: 'utf8'
        }).trim()
        await expect
          .poll(() => {
            try {
              return revParse(E2E_FIXTURE_PATHS.pushBackupRemote, 'refs/heads/main')
            } catch {
              return ''
            }
          })
          .toBe(localHead)
        expect(upstreamOf(E2E_FIXTURE_PATHS.pushRepo, 'main')).toBe('origin/main')
      }
    )
  })

  test('moves the upstream when pushing with setUpstream', async () => {
    await runElectronTest(
      {
        settingsPrefix: 'gitfreddo-e2e-push-upstream-',
        repoPath: E2E_FIXTURE_PATHS.pushRepo
      },
      async (page) => {
        await invokeGitfreddo(page, 'push', { remote: 'backup', branch: 'main', setUpstream: true })
        expect(upstreamOf(E2E_FIXTURE_PATHS.pushRepo, 'main')).toBe('backup/main')
      }
    )
  })
})
