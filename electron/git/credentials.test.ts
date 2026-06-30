import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../github/token-store', () => ({
  loadGitHubToken: vi.fn()
}))

import { loadGitHubToken } from '../github/token-store'
import { buildGitEnv } from './credentials'

describe('buildGitEnv', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.mocked(loadGitHubToken).mockReset()
  })

  it('returns process env unchanged when no token is stored', async () => {
    vi.mocked(loadGitHubToken).mockResolvedValue(null)
    const env = await buildGitEnv()
    expect(env.GIT_ASKPASS).toBeUndefined()
    expect(env.GITFREDO_GITHUB_TOKEN).toBeUndefined()
  })

  it('injects askpass env when a token is present', async () => {
    vi.mocked(loadGitHubToken).mockResolvedValue('gho_test_token')
    const env = await buildGitEnv()
    expect(env.GIT_TERMINAL_PROMPT).toBe('0')
    expect(env.GIT_ASKPASS).toContain('github-askpass.cjs')
    expect(env.GITFREDO_GITHUB_TOKEN).toBe('gho_test_token')
  })
})
