import { test, expect } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { execFileSync } from 'child_process'
import { resolve } from 'path'
import { FIXTURE_REPO } from '../playwright.config'

const mainPath = resolve('out/main/index.js')
const createFixtureScript = resolve('scripts/create-minimal-repo.sh')

test.describe('app smoke', () => {
  test.beforeAll(() => {
    execFileSync('bash', [createFixtureScript], { stdio: 'inherit' })
  })

  test('connects to fixture repo and shows main branch', async () => {
    const electronApp = await electron.launch({
      args: [mainPath],
      env: {
        ...process.env,
        NO_SANDBOX: '1'
      }
    })

    try {
      const page = await electronApp.firstWindow()
      await page.waitForLoadState('domcontentloaded')

      await page.evaluate(async (repoPath: string) => {
        await window.gitfreddo.connect(repoPath)
      }, FIXTURE_REPO)

      await expect(page.getByRole('button', { name: 'main', exact: true })).toBeVisible({
        timeout: 15_000
      })
    } finally {
      await electronApp.close()
    }
  })
})
