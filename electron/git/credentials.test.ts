import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'fs'
import { readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
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
import {
  ASKPASS_SECRETS_ENV,
  buildAskpassScript,
  gitCommandNeedsCredentials,
  prepareGitEnv,
  removeLegacyAskpassSecrets,
  stripForgeTokensFromEnv
} from './credentials'
import { resolveForgeAskpassResponse, type ForgeAskpassSecrets } from './forge-askpass-response'

function mockTokens(github: string | null, bitbucket: string | null, gitlab: string | null) {
  vi.mocked(loadGitHubToken).mockResolvedValue(github)
  vi.mocked(loadBitbucketToken).mockResolvedValue(bitbucket)
  vi.mocked(loadGitlabToken).mockResolvedValue(gitlab)
}

describe('prepareGitEnv', () => {
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
    vi.mocked(loadGitlabToken).mockReset()
    vi.mocked(loadSettings).mockReset()
  })

  it('does not inject askpass env when no token is stored', async () => {
    process.env.GIT_ASKPASS = '/home/gtrig/.config/gitfreddo/forge-askpass.cjs'
    process.env.GIT_TERMINAL_PROMPT = '0'
    process.env.gitfreddo_GITHUB_TOKEN = 'stale-token'
    mockTokens(null, null, null)

    const { env, cleanup } = await prepareGitEnv({ needsCredentials: true })
    await cleanup()

    expect(env.GIT_ASKPASS).toBeUndefined()
    expect(env.GIT_TERMINAL_PROMPT).toBeUndefined()
    expect(env.gitfreddo_GITHUB_TOKEN).toBeUndefined()
    expect(env[ASKPASS_SECRETS_ENV]).toBeUndefined()
  })

  it('preserves a custom GIT_ASKPASS when no token is stored', async () => {
    process.env.GIT_ASKPASS = '/usr/local/bin/my-askpass'
    mockTokens(null, null, null)

    const { env } = await prepareGitEnv({ needsCredentials: true })
    expect(env.GIT_ASKPASS).toBe('/usr/local/bin/my-askpass')
  })

  it('never writes secrets for commands that cannot prompt for credentials', async () => {
    mockTokens('gho_test_token', null, null)

    const { env } = await prepareGitEnv({ needsCredentials: false })

    expect(env.GIT_ASKPASS).toBeUndefined()
    expect(env[ASKPASS_SECRETS_ENV]).toBeUndefined()
    expect(loadGitHubToken).not.toHaveBeenCalled()
  })

  it('drops an inherited secrets path from the parent env', async () => {
    process.env[ASKPASS_SECRETS_ENV] = '/tmp/stale/secrets.json'
    mockTokens(null, null, null)

    const { env } = await prepareGitEnv({ needsCredentials: false })
    expect(env[ASKPASS_SECRETS_ENV]).toBeUndefined()
  })

  it('writes a private per-process secrets file and removes it on cleanup', async () => {
    mockTokens('gho_test_token', null, null)

    const { env, cleanup } = await prepareGitEnv({ needsCredentials: true })
    const secretsPath = env[ASKPASS_SECRETS_ENV]!

    expect(env.GIT_TERMINAL_PROMPT).toBe('0')
    expect(env.GIT_ASKPASS).toContain('forge-askpass.cjs')
    expect(env.gitfreddo_GITHUB_TOKEN).toBeUndefined()
    expect(secretsPath.startsWith('/tmp/gitfreddo-test-askpass-data')).toBe(false)
    if (process.platform !== 'win32') {
      // POSIX permission bits; Windows has no equivalent mode.
      expect(statSync(secretsPath).mode & 0o777).toBe(0o600)
    }
    expect(JSON.parse(await readFile(secretsPath, 'utf8')).githubToken).toBe('gho_test_token')

    await cleanup()
    expect(existsSync(secretsPath)).toBe(false)
  })

  it('gives concurrent git processes separate secrets files', async () => {
    mockTokens('gho_test_token', null, null)

    const [a, b] = await Promise.all([
      prepareGitEnv({ needsCredentials: true }),
      prepareGitEnv({ needsCredentials: true })
    ])
    expect(a.env[ASKPASS_SECRETS_ENV]).not.toBe(b.env[ASKPASS_SECRETS_ENV])
    await Promise.all([a.cleanup(), b.cleanup()])
  })

  it('writes bitbucket auth into the secrets file', async () => {
    mockTokens(null, 'bb_app_password', null)

    const { env, cleanup } = await prepareGitEnv({ needsCredentials: true })
    const secrets = JSON.parse(await readFile(env[ASKPASS_SECRETS_ENV]!, 'utf8'))
    await cleanup()

    expect(secrets.bitbucketToken).toBe('bb_app_password')
    expect(secrets.bitbucketLogin).toBe('alice@example.com')
    expect(secrets.bitbucketAuthType).toBe('app_password')
  })

  it('writes gitlab auth into the secrets file', async () => {
    mockTokens(null, null, 'gl_token')
    vi.mocked(loadSettings).mockResolvedValue({
      bitbucketLogin: '',
      bitbucketAuthLogin: '',
      bitbucketAuthType: null,
      gitlabHost: 'https://gitlab.example.com/'
    } as Awaited<ReturnType<typeof loadSettings>>)

    const { env, cleanup } = await prepareGitEnv({ needsCredentials: true })
    const secrets = JSON.parse(await readFile(env[ASKPASS_SECRETS_ENV]!, 'utf8'))
    await cleanup()

    expect(env.gitfreddo_GITLAB_TOKEN).toBeUndefined()
    expect(secrets.gitlabToken).toBe('gl_token')
    expect(secrets.gitlabHost).toBe('gitlab.example.com')
  })
})

describe('removeLegacyAskpassSecrets', () => {
  it('deletes the old shared plaintext secrets file', async () => {
    const dir = '/tmp/gitfreddo-test-askpass-data'
    mkdirSync(dir, { recursive: true })
    const legacy = join(dir, 'forge-askpass-secrets.json')
    writeFileSync(legacy, '{"githubToken":"old"}')

    await removeLegacyAskpassSecrets()
    expect(existsSync(legacy)).toBe(false)
    await expect(removeLegacyAskpassSecrets()).resolves.toBeUndefined()
  })
})

describe('gitCommandNeedsCredentials', () => {
  it('flags network commands only', () => {
    expect(gitCommandNeedsCredentials(['fetch', 'origin'])).toBe(true)
    expect(gitCommandNeedsCredentials(['-c', 'a=b', 'push', 'origin'])).toBe(true)
    expect(gitCommandNeedsCredentials(['clone', 'https://x', '/tmp/x'])).toBe(true)
    expect(gitCommandNeedsCredentials(['pull'])).toBe(true)
    expect(gitCommandNeedsCredentials(['ls-remote', 'origin'])).toBe(true)
    expect(gitCommandNeedsCredentials(['submodule', 'update', '--init'])).toBe(true)
    expect(gitCommandNeedsCredentials(['submodule', 'add', 'https://x', 'x'])).toBe(true)
    expect(gitCommandNeedsCredentials(['submodule', 'status'])).toBe(false)
    expect(gitCommandNeedsCredentials(['status', '--porcelain=2'])).toBe(false)
    expect(gitCommandNeedsCredentials(['commit', '-m', 'push'])).toBe(false)
  })
})

describe('askpass script parity', () => {
  const secrets: ForgeAskpassSecrets = {
    githubToken: 'gho_github',
    bitbucketToken: 'bb_token',
    bitbucketLogin: 'alice',
    bitbucketAuthType: 'app_password',
    gitlabToken: 'gl_token',
    gitlabHost: 'gitlab.example.com'
  }

  const prompts = [
    "Username for 'https://github.com': ",
    "Password for 'https://x-access-token@github.com': ",
    "Password for 'https://github.attacker.io': ",
    "Password for 'https://notgithub.com': ",
    "Username for 'https://bitbucket.org': ",
    "Password for 'https://bitbucket.org.evil.com': ",
    "Password for 'https://gitlab.com': ",
    "Password for 'https://gitlab.example.com:8443': ",
    "Password for 'https://gitlab.example.com.evil.io': ",
    "Password for 'https://evil.example': "
  ]

  it('the generated script answers exactly like resolveForgeAskpassResponse', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gitfreddo-askpass-parity-'))
    const scriptPath = join(dir, 'askpass.cjs')
    const secretsPath = join(dir, 'secrets.json')
    writeFileSync(scriptPath, buildAskpassScript())
    writeFileSync(secretsPath, JSON.stringify(secrets))

    for (const prompt of prompts) {
      const run = spawnSync(process.execPath, [scriptPath, prompt], {
        env: { [ASKPASS_SECRETS_ENV]: secretsPath },
        encoding: 'utf8'
      })
      const expected = resolveForgeAskpassResponse(prompt, secrets)
      expect({ prompt, stdout: run.stdout, exitCode: run.status }).toEqual({
        prompt,
        stdout: expected.stdout,
        exitCode: expected.exitCode
      })
    }
    expect(readFileSync(scriptPath, 'utf8')).not.toContain('gho_github')
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
