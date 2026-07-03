import { defineConfig } from '@playwright/test'
import { resolve } from 'path'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.spec.ts'
    }
  ],
  reporter: [['list']]
})

export const FIXTURE_REPO = resolve('test/fixtures/minimal-repo')
