import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../token-store', () => ({
  loadGitHubToken: vi.fn()
}))

import { loadGitHubToken } from '../token-store'
import {
  getGitHubApiBase,
  getGitHubTokenOrThrow,
  githubFetch,
  githubJson
} from './http'

describe('getGitHubApiBase', () => {
  const originalHost = process.env.GITHUB_ENTERPRISE_HOST

  afterEach(() => {
    if (originalHost === undefined) {
      delete process.env.GITHUB_ENTERPRISE_HOST
    } else {
      process.env.GITHUB_ENTERPRISE_HOST = originalHost
    }
  })

  it('returns the public API base by default', () => {
    delete process.env.GITHUB_ENTERPRISE_HOST
    expect(getGitHubApiBase()).toBe('https://api.github.com')
  })

  it('normalizes enterprise host values', () => {
    process.env.GITHUB_ENTERPRISE_HOST = 'https://github.example.com/'
    expect(getGitHubApiBase()).toBe('https://github.example.com/api/v3')
  })
})

describe('getGitHubTokenOrThrow', () => {
  beforeEach(() => {
    vi.mocked(loadGitHubToken).mockReset()
  })

  it('returns a trimmed token', async () => {
    vi.mocked(loadGitHubToken).mockResolvedValue('  gho_test  ')
    await expect(getGitHubTokenOrThrow()).resolves.toBe('gho_test')
  })

  it('throws when GitHub is not connected', async () => {
    vi.mocked(loadGitHubToken).mockResolvedValue('')
    await expect(getGitHubTokenOrThrow()).rejects.toThrow(/not connected/i)
  })
})

describe('githubFetch', () => {
  beforeEach(() => {
    vi.mocked(loadGitHubToken).mockReset()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds GitHub auth headers and resolves relative paths', async () => {
    vi.mocked(loadGitHubToken).mockResolvedValue('gho_test')
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await githubFetch('/user')

    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer gho_test',
          Accept: 'application/vnd.github+json'
        })
      })
    )
  })

  it('uses an explicit token when provided', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await githubFetch('https://api.github.com/user', {}, 'gho_explicit')

    expect(loadGitHubToken).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer gho_explicit'
        })
      })
    )
  })
})

describe('githubJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses successful JSON responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ login: 'octocat' }), { status: 200 })
    )

    await expect(githubJson('/user', {}, 'gho_test')).resolves.toEqual({ login: 'octocat' })
  })

  it('throws with status and response body on API errors', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Bad credentials', { status: 401 }))

    await expect(githubJson('/user', {}, 'gho_test')).rejects.toThrow(
      'GitHub API error (401): Bad credentials'
    )
  })
})
