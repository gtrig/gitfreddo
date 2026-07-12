import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as issues from './issues'
import * as http from './http'

vi.mock('./http', () => ({
  githubJson: vi.fn()
}))

describe('GitHub issues API', () => {
  const owner = 'octocat'
  const repo = 'Hello-World'

  beforeEach(() => {
    vi.mocked(http.githubJson).mockReset()
  })

  const rawIssue = {
    number: 42,
    title: 'Bug report',
    state: 'open',
    html_url: 'https://github.com/octocat/Hello-World/issues/42',
    user: { login: 'reporter' },
    body: 'Something broke',
    labels: [{ name: 'bug' }]
  }

  it('lists open issues and excludes pull requests', async () => {
    vi.mocked(http.githubJson).mockResolvedValue([
      rawIssue,
      {
        ...rawIssue,
        number: 43,
        title: 'PR disguised as issue',
        pull_request: {}
      }
    ])

    const listed = await issues.listIssues(owner, repo, 'assignee')

    expect(listed).toEqual([
      {
        number: 42,
        title: 'Bug report',
        state: 'open',
        htmlUrl: 'https://github.com/octocat/Hello-World/issues/42',
        user: 'reporter',
        body: 'Something broke',
        labels: ['bug']
      }
    ])
    expect(http.githubJson).toHaveBeenCalledWith(
      `/repos/${owner}/${repo}/issues?state=open&per_page=100&assignee=assignee`
    )
  })

  it('creates an issue with optional body and labels', async () => {
    vi.mocked(http.githubJson).mockResolvedValue(rawIssue)

    const created = await issues.createIssue(owner, repo, {
      title: 'Bug report',
      body: 'Details',
      labels: ['bug']
    })

    expect(created.number).toBe(42)
    expect(http.githubJson).toHaveBeenCalledWith(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Bug report',
        body: 'Details',
        labels: ['bug']
      })
    })
  })

  it('updates an issue', async () => {
    vi.mocked(http.githubJson).mockResolvedValue({ ...rawIssue, state: 'closed' })

    const updated = await issues.updateIssue(owner, repo, 42, {
      title: 'Fixed bug',
      state: 'closed'
    })

    expect(updated.state).toBe('closed')
    expect(http.githubJson).toHaveBeenCalledWith(`/repos/${owner}/${repo}/issues/42`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Fixed bug', state: 'closed' })
    })
  })
})
