import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../github/token-store', () => ({
  loadGitHubToken: vi.fn()
}))

vi.mock('../bitbucket/token-store', () => ({
  loadBitbucketToken: vi.fn()
}))

vi.mock('../settings', () => ({
  loadSettings: vi.fn()
}))

import { loadBitbucketToken } from '../bitbucket/token-store'
import { loadGitHubToken } from '../github/token-store'
import { loadSettings } from '../settings'
import { buildGitEnv } from './credentials'

describe('buildGitEnv', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.mocked(loadSettings).mockResolvedValue({
      bitbucketLogin: 'gtrig',
      bitbucketAuthLogin: 'alice@example.com',
      bitbucketAuthType: 'app_password'
    } as Awaited<ReturnType<typeof loadSettings>>)
  })

  afterEach(() => {
    process.env = originalEnv
    vi.mocked(loadGitHubToken).mockReset()
    vi.mocked(loadBitbucketToken).mockReset()
    vi.mocked(loadSettings).mockReset()
  })

  it('returns process env unchanged when no token is stored', async () => {
    vi.mocked(loadGitHubToken).mockResolvedValue(null)
    vi.mocked(loadBitbucketToken).mockResolvedValue(null)
    const env = await buildGitEnv()
    expect(env.GIT_ASKPASS).toBeUndefined()
    expect(env.gitfreddo_GITHUB_TOKEN).toBeUndefined()
    expect(env.gitfreddo_BITBUCKET_TOKEN).toBeUndefined()
  })

  it('injects askpass env when a github token is present', async () => {
    vi.mocked(loadGitHubToken).mockResolvedValue('gho_test_token')
    vi.mocked(loadBitbucketToken).mockResolvedValue(null)
    const env = await buildGitEnv()
    expect(env.GIT_TERMINAL_PROMPT).toBe('0')
    expect(env.GIT_ASKPASS).toContain('forge-askpass.cjs')
    expect(env.gitfreddo_GITHUB_TOKEN).toBe('gho_test_token')
  })

  it('injects bitbucket auth env when a bitbucket token is present', async () => {
    vi.mocked(loadGitHubToken).mockResolvedValue(null)
    vi.mocked(loadBitbucketToken).mockResolvedValue('bb_app_password')
    const env = await buildGitEnv()
    expect(env.GIT_ASKPASS).toContain('forge-askpass.cjs')
    expect(env.gitfreddo_BITBUCKET_TOKEN).toBe('bb_app_password')
    expect(env.gitfreddo_BITBUCKET_LOGIN).toBe('alice@example.com')
    expect(env.gitfreddo_BITBUCKET_AUTH_TYPE).toBe('app_password')
  })
})
