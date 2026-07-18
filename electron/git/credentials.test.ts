import { readFile } from 'fs/promises'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'path'

vi.mock('../github/token-store', () => ({
  loadGitHubToken: vi.fn()
}))

vi.mock('../bitbucket/token-store', () => ({
  loadBitbucketToken: vi.fn()
}))

vi.mock('../settings', () => ({
  loadSettings: vi.fn()
}))

vi.mock('../gitlab/token-store', () => ({
  loadGitlabToken: vi.fn()
}))

vi.mock('../paths', () => ({
  getAppDataDir: () => '/tmp/gitfreddo-test-askpass-data'
}))

import { loadBitbucketToken } from '../bitbucket/token-store'
import { loadGitHubToken } from '../github/token-store'
import { loadGitlabToken } from '../gitlab/token-store'
import { loadSettings } from '../settings'
import { buildGitEnv, stripForgeTokensFromEnv } from './credentials'

describe('buildGitEnv', () => {
  const originalEnv = { ...process.env }
  const dataDir = '/tmp/gitfreddo-test-askpass-data'

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
    vi.mocked(loadGitlabToken).mockReset()
    vi.mocked(loadSettings).mockReset()
  })

  it('does not inject askpass env when no token is stored', async () => {
    process.env.GIT_ASKPASS = '/home/gtrig/.config/gitfreddo/forge-askpass.cjs'
    process.env.GIT_TERMINAL_PROMPT = '0'
    process.env.gitfreddo_GITHUB_TOKEN = 'stale-token'

    vi.mocked(loadGitHubToken).mockResolvedValue(null)
    vi.mocked(loadBitbucketToken).mockResolvedValue(null)
    vi.mocked(loadGitlabToken).mockResolvedValue(null)
    const env = await buildGitEnv()

    expect(env.GIT_ASKPASS).toBeUndefined()
    expect(env.GIT_TERMINAL_PROMPT).toBeUndefined()
    expect(env.gitfreddo_GITHUB_TOKEN).toBeUndefined()
    expect(env.gitfreddo_BITBUCKET_TOKEN).toBeUndefined()
  })

  it('preserves a custom GIT_ASKPASS when no token is stored', async () => {
    process.env.GIT_ASKPASS = '/usr/local/bin/my-askpass'

    vi.mocked(loadGitHubToken).mockResolvedValue(null)
    vi.mocked(loadBitbucketToken).mockResolvedValue(null)
    vi.mocked(loadGitlabToken).mockResolvedValue(null)
    const env = await buildGitEnv()

    expect(env.GIT_ASKPASS).toBe('/usr/local/bin/my-askpass')
  })

  it('injects askpass without putting forge tokens in the git process env', async () => {
    vi.mocked(loadGitHubToken).mockResolvedValue('gho_test_token')
    vi.mocked(loadBitbucketToken).mockResolvedValue(null)
    vi.mocked(loadGitlabToken).mockResolvedValue(null)
    const env = await buildGitEnv()
    expect(env.GIT_TERMINAL_PROMPT).toBe('0')
    expect(env.GIT_ASKPASS).toContain('forge-askpass.cjs')
    expect(env.gitfreddo_GITHUB_TOKEN).toBeUndefined()
    expect(env.gitfreddo_BITBUCKET_TOKEN).toBeUndefined()
    expect(env.gitfreddo_GITLAB_TOKEN).toBeUndefined()

    const secrets = JSON.parse(
      await readFile(join(dataDir, 'forge-askpass-secrets.json'), 'utf8')
    )
    expect(secrets.githubToken).toBe('gho_test_token')
  })

  it('writes bitbucket auth into the askpass secrets file', async () => {
    vi.mocked(loadGitHubToken).mockResolvedValue(null)
    vi.mocked(loadBitbucketToken).mockResolvedValue('bb_app_password')
    vi.mocked(loadGitlabToken).mockResolvedValue(null)
    const env = await buildGitEnv()
    expect(env.GIT_ASKPASS).toContain('forge-askpass.cjs')
    expect(env.gitfreddo_BITBUCKET_TOKEN).toBeUndefined()

    const secrets = JSON.parse(
      await readFile(join(dataDir, 'forge-askpass-secrets.json'), 'utf8')
    )
    expect(secrets.bitbucketToken).toBe('bb_app_password')
    expect(secrets.bitbucketLogin).toBe('alice@example.com')
    expect(secrets.bitbucketAuthType).toBe('app_password')
  })

  it('writes gitlab auth into the askpass secrets file', async () => {
    vi.mocked(loadGitHubToken).mockResolvedValue(null)
    vi.mocked(loadBitbucketToken).mockResolvedValue(null)
    vi.mocked(loadGitlabToken).mockResolvedValue('gl_token')
    vi.mocked(loadSettings).mockResolvedValue({
      bitbucketLogin: '',
      bitbucketAuthLogin: '',
      bitbucketAuthType: null,
      gitlabHost: 'https://gitlab.example.com/'
    } as Awaited<ReturnType<typeof loadSettings>>)

    const env = await buildGitEnv()
    expect(env.gitfreddo_GITLAB_TOKEN).toBeUndefined()
    expect(env.gitfreddo_GITLAB_HOST).toBeUndefined()

    const secrets = JSON.parse(
      await readFile(join(dataDir, 'forge-askpass-secrets.json'), 'utf8')
    )
    expect(secrets.gitlabToken).toBe('gl_token')
    expect(secrets.gitlabHost).toBe('gitlab.example.com')
  })
})

describe('stripForgeTokensFromEnv', () => {
  it('removes forge credential env keys', () => {
    const env = stripForgeTokensFromEnv({
      PATH: '/usr/bin',
      gitfreddo_GITHUB_TOKEN: 'secret',
      gitfreddo_BITBUCKET_TOKEN: 'bb',
      gitfreddo_GITLAB_TOKEN: 'gl'
    })
    expect(env.PATH).toBe('/usr/bin')
    expect(env.gitfreddo_GITHUB_TOKEN).toBeUndefined()
    expect(env.gitfreddo_BITBUCKET_TOKEN).toBeUndefined()
    expect(env.gitfreddo_GITLAB_TOKEN).toBeUndefined()
  })
})
