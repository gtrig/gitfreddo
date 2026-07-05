import { test, expect } from '@playwright/test'
import { resolve } from 'path'
import { FIXTURE_REPO } from '../playwright.config'
import { E2E_FIXTURE_PATHS, runElectronTest, useFixture } from './helpers'

const createFixtureScript = resolve('scripts/create-minimal-repo.sh')

test.describe('app smoke', () => {
  useFixture(createFixtureScript, [E2E_FIXTURE_PATHS.minimalRepo])

  test('connects to fixture repo and shows main branch', async () => {
    await runElectronTest({ settingsPrefix: 'gitfreddo-e2e-settings-', repoPath: FIXTURE_REPO }, async (page) => {
      await expect(
        page.getByRole('button', {
          name: 'main',
          exact: true,
          description: 'Click to focus commit · Double-click to checkout'
        })
      ).toBeVisible({
        timeout: 15_000
      })
    })
  })
})
