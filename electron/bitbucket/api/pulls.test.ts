import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./http', () => ({
  bitbucketJson: vi.fn(),
  bitbucketJsonAllPages: vi.fn()
}))

import { bitbucketJson, bitbucketJsonAllPages } from './http'
import { createPullRequest, listPullRequests, mergePullRequest } from './pulls'

describe('bitbucket pulls api', () => {
  beforeEach(() => {
    vi.mocked(bitbucketJson).mockReset()
    vi.mocked(bitbucketJsonAllPages).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists open pull requests with pagelen capped at 50', async () => {
    vi.mocked(bitbucketJsonAllPages).mockResolvedValue([
      {
        id: 42,
        title: 'Add auth',
        state: 'OPEN',
        links: { html: { href: 'https://bitbucket.org/ws/repo/pull-requests/42' } },
        author: { nickname: 'dev' },
        source: { branch: { name: 'feature' }, commit: { hash: 'abc' } },
        destination: { branch: { name: 'main' }, commit: { hash: 'def' } },
        summary: { raw: 'Summary text' },
        draft: false
      }
    ])

    const pulls = await listPullRequests('ws', 'repo')
    expect(bitbucketJsonAllPages).toHaveBeenCalledWith(
      '/repositories/ws/repo/pullrequests?state=OPEN&pagelen=50',
      undefined
    )
    expect(pulls).toHaveLength(1)
    expect(pulls[0]).toMatchObject({
      number: 42,
      title: 'Add auth',
      state: 'open',
      user: 'dev',
      head: { ref: 'feature', sha: 'abc' },
      base: { ref: 'main', sha: 'def' },
      body: 'Summary text'
    })
  })

  it('creates a pull request', async () => {
    vi.mocked(bitbucketJson).mockResolvedValue({
      id: 7,
      title: 'New PR',
      state: 'OPEN',
      links: { html: { href: 'https://bitbucket.org/ws/repo/pull-requests/7' } },
      author: { display_name: 'Dev User' },
      source: { branch: { name: 'feature' } },
      destination: { branch: { name: 'main' } },
      summary: { raw: 'Body' }
    })

    const pull = await createPullRequest('ws', 'repo', {
      title: 'New PR',
      head: 'feature',
      base: 'main',
      body: 'Body'
    })

    expect(bitbucketJson).toHaveBeenCalledWith(
      '/repositories/ws/repo/pullrequests',
      expect.objectContaining({ method: 'POST' }),
      undefined,
      undefined
    )
    expect(pull.number).toBe(7)
    expect(pull.title).toBe('New PR')
  })

  it('merges a pull request with the selected strategy', async () => {
    vi.mocked(bitbucketJson).mockResolvedValue(undefined)

    await mergePullRequest('ws', 'repo', 9, 'squash')
    expect(bitbucketJson).toHaveBeenCalledWith(
      '/repositories/ws/repo/pullrequests/9/merge',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('squash')
      }),
      undefined,
      undefined
    )
  })
})
