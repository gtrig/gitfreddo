import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./http', () => ({
  gitlabJson: vi.fn()
}))

vi.mock('./repos', () => ({
  projectWebUrl: vi.fn(() => 'https://gitlab.com/acme/demo')
}))

import { gitlabJson } from './http'
import { createIssue, listIssues, updateIssue } from './issues'

const rawIssue = {
  iid: 3,
  title: 'Bug report',
  state: 'opened',
  web_url: 'https://gitlab.com/acme/demo/-/issues/3',
  author: { username: 'gtrig' },
  description: 'Something broke',
  labels: ['bug']
}

describe('gitlab issues api', () => {
  beforeEach(() => {
    vi.mocked(gitlabJson).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists and maps open issues', async () => {
    vi.mocked(gitlabJson).mockResolvedValue([rawIssue])

    const issues = await listIssues('acme', 'demo', undefined, 'gitlab.com')

    expect(issues).toEqual([
      {
        number: 3,
        title: 'Bug report',
        state: 'open',
        htmlUrl: 'https://gitlab.com/acme/demo/-/issues/3',
        user: 'gtrig',
        body: 'Something broke',
        labels: ['bug']
      }
    ])
  })

  it('filters by assignee when provided', async () => {
    vi.mocked(gitlabJson).mockResolvedValue([rawIssue])

    await listIssues('acme', 'demo', 'gtrig', 'gitlab.com')

    const calledPath = vi.mocked(gitlabJson).mock.calls[0]?.[0] as string
    expect(calledPath).toContain('assignee_username=gtrig')
  })

  it('throws a friendly error when issues are disabled (404)', async () => {
    vi.mocked(gitlabJson).mockRejectedValue(new Error('GitLab API error (404): Not Found'))

    await expect(listIssues('acme', 'demo', undefined, 'gitlab.com')).rejects.toThrow(
      /not enabled/i
    )
  })

  it('rethrows non-404 errors when listing issues', async () => {
    vi.mocked(gitlabJson).mockRejectedValue(new Error('GitLab API error (500): boom'))

    await expect(listIssues('acme', 'demo', undefined, 'gitlab.com')).rejects.toThrow(/500/)
  })

  it('creates an issue', async () => {
    vi.mocked(gitlabJson).mockResolvedValue({ ...rawIssue, iid: 4, title: 'New issue' })

    const issue = await createIssue(
      'acme',
      'demo',
      { title: 'New issue', body: 'Body', labels: ['a', 'b'] },
      'gitlab.com'
    )

    expect(issue.number).toBe(4)
    expect(gitlabJson).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent('acme/demo')}/issues`,
      expect.objectContaining({ method: 'POST' }),
      undefined,
      'gitlab.com'
    )
  })

  it('updates an issue state to closed', async () => {
    vi.mocked(gitlabJson).mockResolvedValue({ ...rawIssue, state: 'closed' })

    const issue = await updateIssue(
      'acme',
      'demo',
      3,
      { state: 'closed' },
      'gitlab.com'
    )

    expect(issue.state).toBe('closed')
    expect(gitlabJson).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent('acme/demo')}/issues/3`,
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"state_event":"close"')
      }),
      undefined,
      'gitlab.com'
    )
  })
})
