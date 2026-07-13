import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getGitHubGraphqlUrl, githubGraphql } from './graphql'

vi.mock('./http', () => ({
  getGitHubApiBase: vi.fn(() => 'https://api.github.com'),
  getGitHubTokenOrThrow: vi.fn(async () => 'gho_test')
}))

import { getGitHubApiBase, getGitHubTokenOrThrow } from './http'

describe('graphql', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getGitHubApiBase).mockReturnValue('https://api.github.com')
    vi.mocked(getGitHubTokenOrThrow).mockResolvedValue('gho_test')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds the github.com graphql url', () => {
    expect(getGitHubGraphqlUrl()).toBe('https://api.github.com/graphql')
  })

  it('builds the enterprise graphql url', () => {
    vi.mocked(getGitHubApiBase).mockReturnValue('https://github.example.com/api/v3')
    expect(getGitHubGraphqlUrl()).toBe('https://github.example.com/api/graphql')
  })

  it('returns graphql data on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { viewer: { login: 'octocat' } } }), { status: 200 })
      )
    )

    await expect(githubGraphql('{ viewer { login } }')).resolves.toEqual({
      viewer: { login: 'octocat' }
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/graphql',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer gho_test'
        })
      })
    )
  })

  it('uses an explicit token when provided', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { ok: true } }), { status: 200 })
      )
    )

    await githubGraphql('{ ok }', {}, 'gho_explicit')
    expect(getGitHubTokenOrThrow).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer gho_explicit'
        })
      })
    )
  })

  it('throws when the HTTP response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Bad credentials', { status: 401 }))
    )

    await expect(githubGraphql('{ viewer { login } }')).rejects.toThrow(
      /GraphQL error \(401\)/
    )
  })

  it('throws when GraphQL returns errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ errors: [{ message: 'Field error' }, { message: 'Second error' }] }),
          { status: 200 }
        )
      )
    )

    await expect(githubGraphql('{ viewer { login } }')).rejects.toThrow('Field error; Second error')
  })

  it('throws when GraphQL returns no data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: null }), { status: 200 }))
    )

    await expect(githubGraphql('{ viewer { login } }')).rejects.toThrow(/returned no data/)
  })
})
