import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./http', () => ({
  gitlabJson: vi.fn()
}))

vi.mock('./repos', () => ({
  projectWebUrl: vi.fn(() => 'https://gitlab.com/acme/demo')
}))

import { gitlabJson } from './http'
import { createMergeRequest, listMergeRequests, mergeMergeRequest } from './pulls'

const rawMr = {
  iid: 7,
  title: 'Add feature',
  state: 'opened',
  web_url: 'https://gitlab.com/acme/demo/-/merge_requests/7',
  author: { username: 'gtrig' },
  source_branch: 'feature',
  target_branch: 'main',
  sha: 'abc',
  description: 'desc',
  draft: false,
  merge_status: 'can_be_merged',
  diff_refs: { head_sha: 'head1', base_sha: 'base1' }
}

describe('gitlab pulls api', () => {
  beforeEach(() => {
    vi.mocked(gitlabJson).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists and maps open merge requests', async () => {
    vi.mocked(gitlabJson).mockResolvedValue([rawMr])

    const prs = await listMergeRequests('acme', 'demo', 'gitlab.com')

    expect(prs).toEqual([
      {
        number: 7,
        title: 'Add feature',
        state: 'open',
        htmlUrl: 'https://gitlab.com/acme/demo/-/merge_requests/7',
        user: 'gtrig',
        head: { ref: 'feature', sha: 'head1' },
        base: { ref: 'main', sha: 'base1' },
        body: 'desc',
        draft: false,
        mergeable: true
      }
    ])
    expect(gitlabJson).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent('acme/demo')}/merge_requests?state=opened&per_page=100`,
      {},
      undefined,
      'gitlab.com'
    )
  })

  it('creates a merge request', async () => {
    vi.mocked(gitlabJson).mockResolvedValue({ ...rawMr, iid: 8, title: 'New MR' })

    const pr = await createMergeRequest(
      'acme',
      'demo',
      { title: 'New MR', head: 'feature', base: 'main', body: 'Body' },
      'gitlab.com'
    )

    expect(pr.number).toBe(8)
    expect(pr.title).toBe('New MR')
    expect(gitlabJson).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent('acme/demo')}/merge_requests`,
      expect.objectContaining({ method: 'POST' }),
      undefined,
      'gitlab.com'
    )
  })

  it('merges a merge request with the selected strategy', async () => {
    vi.mocked(gitlabJson).mockResolvedValue(undefined)

    await mergeMergeRequest('acme', 'demo', 9, 'squash', 'gitlab.com')

    expect(gitlabJson).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent('acme/demo')}/merge_requests/9/merge`,
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"squash":true')
      }),
      undefined,
      'gitlab.com'
    )
  })
})
