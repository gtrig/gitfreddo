import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../token-store', () => ({
  loadBitbucketToken: vi.fn()
}))

import { loadBitbucketToken } from '../token-store'
import {
  bitbucketFetch,
  bitbucketJson,
  bitbucketJsonAllPages,
  buildBitbucketAuthHeader,
  getBitbucketApiBase,
  getBitbucketTokenOrThrow
} from './http'

describe('getBitbucketApiBase', () => {
  it('returns the default Bitbucket API base URL', () => {
    expect(getBitbucketApiBase()).toBe('https://api.bitbucket.org/2.0')
  })
})

describe('buildBitbucketAuthHeader', () => {
  it('uses bearer auth for oauth tokens', () => {
    expect(
      buildBitbucketAuthHeader('oauth-token', {
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: '',
        bitbucketAuthType: 'oauth'
      })
    ).toBe('Bearer oauth-token')
  })

  it('uses basic auth for app passwords', () => {
    const header = buildBitbucketAuthHeader('secret', {
      bitbucketLogin: 'user@example.com',
      bitbucketAuthLogin: 'user@example.com',
      bitbucketAuthType: 'app_password'
    })

    expect(header).toBe(
      `Basic ${Buffer.from('user@example.com:secret').toString('base64')}`
    )
  })

  it('throws when app password auth is missing a username', () => {
    expect(() =>
      buildBitbucketAuthHeader('secret', {
        bitbucketLogin: '',
        bitbucketAuthLogin: '',
        bitbucketAuthType: 'app_password'
      })
    ).toThrow(/username is missing/i)
  })
})

describe('getBitbucketTokenOrThrow', () => {
  beforeEach(() => {
    vi.mocked(loadBitbucketToken).mockReset()
  })

  it('returns a trimmed token', async () => {
    vi.mocked(loadBitbucketToken).mockResolvedValue('  token  ')
    await expect(getBitbucketTokenOrThrow()).resolves.toBe('token')
  })

  it('throws when Bitbucket is not connected', async () => {
    vi.mocked(loadBitbucketToken).mockResolvedValue('')
    await expect(getBitbucketTokenOrThrow()).rejects.toThrow(/not connected/i)
  })
})

describe('bitbucketFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds auth headers and resolves relative paths', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await bitbucketFetch('/user', {}, 'oauth-token', {
      bitbucketLogin: 'gtrig',
      bitbucketAuthLogin: '',
      bitbucketAuthType: 'oauth'
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://api.bitbucket.org/2.0/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer oauth-token'
        })
      })
    )
  })
})

describe('bitbucketJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses successful JSON responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ username: 'gtrig' }), { status: 200 })
    )

    await expect(
      bitbucketJson('/user', {}, 'token', {
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: '',
        bitbucketAuthType: 'oauth'
      })
    ).resolves.toEqual({ username: 'gtrig' })
  })

  it('returns undefined for 204 responses', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

    await expect(
      bitbucketJson('/resource', {}, 'token', {
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: '',
        bitbucketAuthType: 'oauth'
      })
    ).resolves.toBeUndefined()
  })

  it('throws with status and response body on API errors', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Forbidden', { status: 403 }))

    await expect(
      bitbucketJson('/user', {}, 'token', {
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: '',
        bitbucketAuthType: 'oauth'
      })
    ).rejects.toThrow('Bitbucket API error (403): Forbidden')
  })
})

describe('bitbucketJsonAllPages', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('follows paginated next links until exhausted', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            values: [{ slug: 'workspace-a' }],
            next: 'https://api.bitbucket.org/2.0/workspaces?page=2'
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ values: [{ slug: 'workspace-b' }] }), { status: 200 })
      )

    await expect(
      bitbucketJsonAllPages('/workspaces', {
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: '',
        bitbucketAuthType: 'oauth'
      }, 'token')
    ).resolves.toEqual([{ slug: 'workspace-a' }, { slug: 'workspace-b' }])

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenLastCalledWith(
      'https://api.bitbucket.org/2.0/workspaces?page=2',
      expect.any(Object)
    )
  })
})
