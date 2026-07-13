import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../token-store', () => ({
  loadGitlabToken: vi.fn()
}))

import { loadGitlabToken } from '../token-store'
import {
  getGitlabApiBase,
  getGitlabTokenOrThrow,
  gitlabFetch,
  gitlabJson,
  gitlabJsonAllPages,
  resolveGitlabHost
} from './http'

describe('resolveGitlabHost', () => {
  it('prefers settings host over env default', () => {
    expect(resolveGitlabHost('gitlab.mycompany.com')).toBe('gitlab.mycompany.com')
  })

  it('falls back to gitlab.com', () => {
    expect(resolveGitlabHost(null)).toBe('gitlab.com')
  })
})

describe('getGitlabApiBase', () => {
  it('returns the default GitLab API base URL', () => {
    expect(getGitlabApiBase()).toBe('https://gitlab.com/api/v4')
  })

  it('returns self-managed API base URL', () => {
    expect(getGitlabApiBase('gitlab.mycompany.com')).toBe(
      'https://gitlab.mycompany.com/api/v4'
    )
  })
})

describe('getGitlabTokenOrThrow', () => {
  beforeEach(() => {
    vi.mocked(loadGitlabToken).mockReset()
  })

  it('returns a trimmed token', async () => {
    vi.mocked(loadGitlabToken).mockResolvedValue('  token  ')
    await expect(getGitlabTokenOrThrow()).resolves.toBe('token')
  })

  it('throws when GitLab is not connected', async () => {
    vi.mocked(loadGitlabToken).mockResolvedValue('')
    await expect(getGitlabTokenOrThrow()).rejects.toThrow(/not connected/i)
  })
})

describe('gitlabFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds auth headers and resolves relative paths', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await gitlabFetch('/user', {}, 'token')

    expect(fetch).toHaveBeenCalledWith(
      'https://gitlab.com/api/v4/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token'
        })
      })
    )
  })

  it('merges caller-supplied headers and leaves absolute URLs unchanged', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await gitlabFetch(
      'https://gitlab.com/api/v4/user',
      { headers: { 'Content-Type': 'application/json' } },
      'token'
    )

    expect(fetch).toHaveBeenCalledWith(
      'https://gitlab.com/api/v4/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        })
      })
    )
  })

  it('loads the token when none is supplied', async () => {
    vi.mocked(loadGitlabToken).mockResolvedValue('stored-token')
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await gitlabFetch('/user')

    expect(fetch).toHaveBeenCalledWith(
      'https://gitlab.com/api/v4/user',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer stored-token' })
      })
    )
  })
})

describe('gitlabJson', () => {
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

    await expect(gitlabJson('/user', {}, 'token')).resolves.toEqual({ username: 'gtrig' })
  })

  it('throws with status and response body on API errors', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Forbidden', { status: 403 }))

    await expect(gitlabJson('/user', {}, 'token')).rejects.toThrow('GitLab API error (403): Forbidden')
  })

  it('returns undefined for 204 No Content responses', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

    await expect(gitlabJson('/user/keys/1', { method: 'DELETE' }, 'token')).resolves.toBeUndefined()
  })
})

describe('gitlabJsonAllPages', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('follows paginated link headers until exhausted', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1 }]), {
          status: 200,
          headers: {
            link: '<https://gitlab.com/api/v4/projects?page=2>; rel="next"'
          }
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 2 }]), { status: 200 }))

    await expect(gitlabJsonAllPages('/projects', null, 'token')).resolves.toEqual([
      { id: 1 },
      { id: 2 }
    ])

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenLastCalledWith(
      'https://gitlab.com/api/v4/projects?page=2',
      expect.any(Object)
    )
  })

  it('throws with status and body when a page request fails', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Server error', { status: 500 }))

    await expect(gitlabJsonAllPages('/projects', null, 'token')).rejects.toThrow(
      'GitLab API error (500): Server error'
    )
  })
})
