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
