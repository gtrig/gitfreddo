import { describe, expect, it } from 'vitest'
import {
  hostFromAskpassPrompt,
  resolveForgeAskpassResponse,
  type ForgeAskpassSecrets
} from './forge-askpass-response'

const secrets = (overrides: Partial<ForgeAskpassSecrets> = {}): ForgeAskpassSecrets => ({
  githubToken: 'gho_github',
  bitbucketToken: 'bb_token',
  bitbucketLogin: 'alice',
  bitbucketAuthType: 'oauth',
  gitlabToken: 'gl_token',
  gitlabHost: 'gitlab.com',
  ...overrides
})

describe('hostFromAskpassPrompt', () => {
  it('extracts host from https URL in the prompt', () => {
    expect(hostFromAskpassPrompt("password for 'https://github.com':")).toBe('github.com')
  })
})

describe('resolveForgeAskpassResponse', () => {
  it('returns the matching forge password for a known host', () => {
    expect(
      resolveForgeAskpassResponse("Password for 'https://github.com':", secrets())
    ).toEqual({ stdout: 'gho_github', exitCode: 0 })
    expect(
      resolveForgeAskpassResponse("Password for 'https://bitbucket.org':", secrets())
    ).toEqual({ stdout: 'bb_token', exitCode: 0 })
    expect(
      resolveForgeAskpassResponse("Password for 'https://gitlab.com':", secrets())
    ).toEqual({ stdout: 'gl_token', exitCode: 0 })
  })

  it('fails closed for unknown hosts instead of falling back to forge tokens', () => {
    expect(
      resolveForgeAskpassResponse("Password for 'https://evil.example':", secrets())
    ).toEqual({ stdout: '', exitCode: 1 })
  })

  it('fails closed when the known host has no matching token', () => {
    expect(
      resolveForgeAskpassResponse(
        "Password for 'https://github.com':",
        secrets({ githubToken: '' })
      )
    ).toEqual({ stdout: '', exitCode: 1 })
  })

  it('returns usernames only for known hosts with a matching token', () => {
    expect(
      resolveForgeAskpassResponse("Username for 'https://github.com':", secrets())
    ).toEqual({ stdout: 'x-access-token', exitCode: 0 })
    expect(
      resolveForgeAskpassResponse("Username for 'https://evil.example':", secrets())
    ).toEqual({ stdout: '', exitCode: 1 })
  })

  it('uses app-password login for Bitbucket when configured', () => {
    expect(
      resolveForgeAskpassResponse(
        "Username for 'https://bitbucket.org':",
        secrets({ bitbucketAuthType: 'app_password', bitbucketLogin: 'alice@ex.com' })
      )
    ).toEqual({ stdout: 'alice@ex.com', exitCode: 0 })
  })
})

describe('hostFromAskpassPrompt — userinfo and ports', () => {
  it('strips userinfo and port from the prompt host', () => {
    expect(hostFromAskpassPrompt("Password for 'https://u@github.com':")).toBe('github.com')
    expect(hostFromAskpassPrompt("Password for 'https://u:x@gitlab.example.com:8443':")).toBe(
      'gitlab.example.com'
    )
  })
})

describe('resolveForgeAskpassResponse — exact host matching', () => {
  const lookalikes = [
    'https://github.attacker.io',
    'https://notgithub.com',
    'https://github.com.evil.io',
    'https://bitbucket.org.evil.com',
    'https://evilbitbucket.org',
    'https://gitlab.com.evil.io',
    'https://mygitlab.com',
    'https://foo.gitlab.com'
  ]

  for (const host of lookalikes) {
    it(`does not hand out a token for ${host}`, () => {
      expect(resolveForgeAskpassResponse(`Password for '${host}':`, secrets())).toEqual({
        stdout: '',
        exitCode: 1
      })
      expect(resolveForgeAskpassResponse(`Username for '${host}':`, secrets())).toEqual({
        stdout: '',
        exitCode: 1
      })
    })
  }

  it('matches a known host when the prompt carries userinfo', () => {
    expect(
      resolveForgeAskpassResponse("Password for 'https://x-access-token@github.com':", secrets())
    ).toEqual({ stdout: 'gho_github', exitCode: 0 })
  })

  it('matches a self-hosted GitLab host exactly, ignoring ports', () => {
    const selfHosted = secrets({ gitlabHost: 'gitlab.example.com' })
    expect(
      resolveForgeAskpassResponse("Password for 'https://gitlab.example.com:8443':", selfHosted)
    ).toEqual({ stdout: 'gl_token', exitCode: 0 })
    expect(
      resolveForgeAskpassResponse("Password for 'https://gitlab.example.com.evil.io':", selfHosted)
    ).toEqual({ stdout: '', exitCode: 1 })
  })
})
