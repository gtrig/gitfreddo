import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as issues from './issues'
import * as http from './http'

vi.mock('./http', () => ({
  bitbucketJson: vi.fn()
}))

describe('Bitbucket issues API', () => {
  const workspace = 'workspace'
  const repo = 'demo'
  const settings = {
    bitbucketLogin: 'gtrig',
    bitbucketAuthLogin: '',
    bitbucketAuthType: 'oauth' as const
  }

  beforeEach(() => {
    vi.mocked(http.bitbucketJson).mockReset()
  })

  const rawIssue = {
    id: 7,
    title: 'Bug report',
    state: 'open',
    links: { html: { href: 'https://bitbucket.org/workspace/demo/issues/7' } },
    reporter: { nickname: 'reporter' },
    content: { raw: 'Something broke' },
    kind: 'bug'
  }

  it('lists open issues for a repository', async () => {
    vi.mocked(http.bitbucketJson).mockResolvedValue({ values: [rawIssue] })

    const listed = await issues.listIssues(workspace, repo, undefined, settings)

    expect(listed).toEqual([
      {
        number: 7,
        title: 'Bug report',
        state: 'open',
        htmlUrl: 'https://bitbucket.org/workspace/demo/issues/7',
        user: 'reporter',
        body: 'Something broke',
        labels: ['bug']
      }
    ])
    expect(http.bitbucketJson).toHaveBeenCalledWith(
      `/repositories/${workspace}/${repo}/issues?pagelen=100&q=state%3D%22open%22`,
      {},
      undefined,
      settings
    )
  })

  it('filters open issues by assignee', async () => {
    vi.mocked(http.bitbucketJson).mockResolvedValue({ values: [] })

    await issues.listIssues(workspace, repo, 'gtrig', settings)

    expect(http.bitbucketJson).toHaveBeenCalledWith(
      `/repositories/${workspace}/${repo}/issues?pagelen=100&q=state%3D%22open%22+AND+assignee.username%3D%22gtrig%22`,
      {},
      undefined,
      settings
    )
  })

  it('maps disabled issue trackers to a friendly error', async () => {
    vi.mocked(http.bitbucketJson).mockRejectedValue(new Error('Bitbucket API error (404): missing'))

    await expect(issues.listIssues(workspace, repo, undefined, settings)).rejects.toThrow(
      /issue tracker is not enabled/i
    )
  })

  it('creates an issue with default kind', async () => {
    vi.mocked(http.bitbucketJson).mockResolvedValue(rawIssue)

    const created = await issues.createIssue(
      workspace,
      repo,
      { title: 'Bug report', body: 'Details' },
      settings
    )

    expect(created.number).toBe(7)
    expect(http.bitbucketJson).toHaveBeenCalledWith(
      `/repositories/${workspace}/${repo}/issues`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Bug report',
          content: { raw: 'Details' },
          kind: 'bug'
        })
      }),
      undefined,
      settings
    )
  })

  it('updates issue state using Bitbucket resolved semantics', async () => {
    vi.mocked(http.bitbucketJson).mockResolvedValue({ ...rawIssue, state: 'resolved' })

    const updated = await issues.updateIssue(
      workspace,
      repo,
      7,
      { title: 'Fixed bug', body: 'Done', state: 'closed' },
      settings
    )

    expect(updated.state).toBe('closed')
    expect(http.bitbucketJson).toHaveBeenCalledWith(
      `/repositories/${workspace}/${repo}/issues/7`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          title: 'Fixed bug',
          content: { raw: 'Done' },
          state: 'resolved'
        })
      }),
      undefined,
      settings
    )
  })
})
