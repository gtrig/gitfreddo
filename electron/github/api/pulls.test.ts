import { describe, expect, it, vi, beforeEach } from 'vitest'
import * as pullApis from './pulls'
import * as http from './http'

vi.mock('./http', () => ({
  githubJson: vi.fn()
}))

describe('GitHub Pull Request API', () => {
  const owner = 'owner'
  const repo = 'repo'
  const number = 1

  beforeEach(() => {
    vi.mocked(http.githubJson).mockReset()
  })

  describe('postComment', () => {
    it('should call githubJson with correct parameters', async () => {
      const body = 'Test comment'
      vi.mocked(http.githubJson).mockResolvedValue({ status: 'success' })

      await pullApis.postComment(owner, repo, number, body)

      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body })
        }
      )
    })
  })

  describe('listPullRequestConversationComments', () => {
    it('should map issue conversation comments', async () => {
      vi.mocked(http.githubJson).mockResolvedValue([
        {
          id: 10,
          body: 'Please update docs',
          user: { login: 'reviewer' },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z'
        }
      ])

      const comments = await pullApis.listPullRequestConversationComments(owner, repo, number)

      expect(comments).toEqual([
        {
          id: 10,
          body: 'Please update docs',
          user: 'reviewer',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z'
        }
      ])
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`
      )
    })
  })

  describe('listPullRequestReviewComments', () => {
    it('should return list of review comments', async () => {
      const mockComments = [
        {
          id: 1,
          body: 'Comment 1',
          user: { login: 'dev' },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          path: 'src/a.ts',
          line: 4,
          original_line: 4,
          side: 'RIGHT',
          commit_id: 'abc'
        }
      ]
      vi.mocked(http.githubJson).mockResolvedValue(mockComments)

      const comments = await pullApis.listPullRequestReviewComments(owner, repo, number)

      expect(comments).toEqual([
        {
          id: 1,
          body: 'Comment 1',
          user: 'dev',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          path: 'src/a.ts',
          line: 4,
          originalLine: 4,
          side: 'RIGHT',
          commitId: 'abc'
        }
      ])
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/comments?per_page=100`
      )
    })

    it('falls back to original_line when line is null', async () => {
      vi.mocked(http.githubJson).mockResolvedValue([
        {
          id: 2,
          body: 'Outdated thread',
          user: { login: 'dev' },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          path: 'electron/github/api/pulls.test.ts',
          line: null,
          original_line: 9,
          side: null,
          commit_id: 'abc'
        }
      ])

      const comments = await pullApis.listPullRequestReviewComments(owner, repo, number)

      expect(comments[0]?.line).toBeNull()
      expect(comments[0]?.originalLine).toBe(9)
    })
  })

  describe('listComments', () => {
    it('should return list of comments', async () => {
      vi.mocked(http.githubJson).mockResolvedValue([
        {
          id: 1,
          body: 'Comment 1',
          user: { login: 'dev' },
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          path: 'a.ts',
          line: 1,
          original_line: 1,
          side: 'RIGHT',
          commit_id: 'abc'
        }
      ])

      const comments = await pullApis.listComments(owner, repo, number)

      expect(comments[0]?.body).toBe('Comment 1')
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/comments?per_page=100`
      )
    })
  })

  describe('updatePullRequest', () => {
    it('should update PR title and body', async () => {
      const mockUpdatedPr = { 
        id: 1, 
        title: 'New Title', 
        body: 'New Body',
        state: 'open',
        html_url: 'https://github.com/owner/repo/pull/1',
        user: { login: 'user1' },
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        draft: false,
        mergeable: true,
        number: 1
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockUpdatedPr)

      const result = await pullApis.updatePullRequest(owner, repo, number, {
        title: 'New Title',
        body: 'New Body'
      })

      expect(result).toEqual({
        number: 1,
        title: 'New Title',
        body: 'New Body',
        state: 'open',
        htmlUrl: 'https://github.com/owner/repo/pull/1',
        repository: { owner: 'owner', repo: 'repo' },
        user: 'user1',
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        draft: false,
        mergeable: true
      })
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Title', body: 'New Body' })
        }
      )
    })

    it('should update only title when body not provided', async () => {
      const mockUpdatedPr = { 
        id: 1, 
        title: 'New Title', 
        body: 'Old Body',
        state: 'open',
        html_url: 'https://github.com/owner/repo/pull/1',
        user: { login: 'user1' },
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        draft: false,
        mergeable: true,
        number: 1
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockUpdatedPr)

      const result = await pullApis.updatePullRequest(owner, repo, number, {
        title: 'New Title'
      })

      expect(result).toEqual({
        number: 1,
        title: 'New Title',
        body: 'Old Body',
        state: 'open',
        htmlUrl: 'https://github.com/owner/repo/pull/1',
        repository: { owner: 'owner', repo: 'repo' },
        user: 'user1',
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        draft: false,
        mergeable: true
      })
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Title' })
        }
      )
    })

    it('should update only body when title not provided', async () => {
      const mockUpdatedPr = { 
        id: 1, 
        title: 'Old Title', 
        body: 'New Body',
        state: 'open',
        html_url: 'https://github.com/owner/repo/pull/1',
        user: { login: 'user1' },
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        draft: false,
        mergeable: true,
        number: 1
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockUpdatedPr)

      const result = await pullApis.updatePullRequest(owner, repo, number, {
        body: 'New Body'
      })

      expect(result).toEqual({
        number: 1,
        title: 'Old Title',
        body: 'New Body',
        state: 'open',
        htmlUrl: 'https://github.com/owner/repo/pull/1',
        repository: { owner: 'owner', repo: 'repo' },
        user: 'user1',
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        draft: false,
        mergeable: true
      })
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: 'New Body' })
        }
      )
    })
  })

  describe('mergePullRequest', () => {
    it('should merge PR with default options', async () => {
      const mockResult = { 
        sha: 'abc123', 
        merged: true, 
        message: 'Pull Request merged' 
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockResult)

      const result = await pullApis.mergePullRequest(owner, repo, number)

      expect(result).toEqual(mockResult)
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/merge`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }
      )
    })

    it('should merge PR with custom commit message', async () => {
      const mockResult = { 
        sha: 'abc123', 
        merged: true, 
        message: 'Custom merge message' 
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockResult)

      const result = await pullApis.mergePullRequest(owner, repo, number, {
        commitMessage: 'Custom merge message'
      })

      expect(result).toEqual(mockResult)
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/merge`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commit_message: 'Custom merge message' })
        }
      )
    })

    it('should merge PR with merge method', async () => {
      const mockResult = { 
        sha: 'abc123', 
        merged: true, 
        message: 'Pull Request merged' 
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockResult)

      const result = await pullApis.mergePullRequest(owner, repo, number, {
        mergeMethod: 'squash'
      })

      expect(result).toEqual(mockResult)
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/merge`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merge_method: 'squash' })
        }
      )
    })
  })

  describe('closePullRequest', () => {
    it('should close PR by updating state to closed', async () => {
      const mockClosedPr = { 
        id: 1, 
        title: 'Test PR', 
        body: 'Body',
        state: 'closed',
        html_url: 'https://github.com/owner/repo/pull/1',
        user: { login: 'user1' },
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        draft: false,
        mergeable: true,
        number: 1
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockClosedPr)

      const result = await pullApis.closePullRequest(owner, repo, number)

      expect(result).toEqual({
        number: 1,
        title: 'Test PR',
        body: 'Body',
        state: 'closed',
        htmlUrl: 'https://github.com/owner/repo/pull/1',
        repository: { owner: 'owner', repo: 'repo' },
        user: 'user1',
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        draft: false,
        mergeable: true
      })
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: 'closed' })
        }
      )
    })
  })

  describe('reopenPullRequest', () => {
    it('should reopen PR by updating state to open', async () => {
      const mockReopenedPr = { 
        id: 1, 
        title: 'Test PR', 
        body: 'Body',
        state: 'open',
        html_url: 'https://github.com/owner/repo/pull/1',
        user: { login: 'user1' },
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        draft: false,
        mergeable: true,
        number: 1
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockReopenedPr)

      const result = await pullApis.reopenPullRequest(owner, repo, number)

      expect(result).toEqual({
        number: 1,
        title: 'Test PR',
        body: 'Body',
        state: 'open',
        htmlUrl: 'https://github.com/owner/repo/pull/1',
        repository: { owner: 'owner', repo: 'repo' },
        user: 'user1',
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        draft: false,
        mergeable: true
      })
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: 'open' })
        }
      )
    })
  })

  describe('requestReview', () => {
    it('should request review from reviewers', async () => {
      const mockResult = { 
        id: 1, 
        user: { login: 'reviewer1' },
        state: 'PENDING'
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockResult)

      const result = await pullApis.requestReview(owner, repo, number, {
        reviewers: ['reviewer1', 'reviewer2']
      })

      expect(result).toEqual(mockResult)
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/requested_reviewers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewers: ['reviewer1', 'reviewer2'] })
        }
      )
    })

    it('should request review with team reviewers', async () => {
      const mockResult = { 
        id: 1, 
        user: { login: 'reviewer1' },
        state: 'PENDING'
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockResult)

      const result = await pullApis.requestReview(owner, repo, number, {
        reviewers: ['reviewer1'],
        teamReviewers: ['team1']
      })

      expect(result).toEqual(mockResult)
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/requested_reviewers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewers: ['reviewer1'], team_reviewers: ['team1'] })
        }
      )
    })
  })

  describe('submitReview', () => {
    it('should submit approval review', async () => {
      const mockResult = { 
        id: 1, 
        state: 'APPROVED',
        body: 'LGTM'
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockResult)

      const result = await pullApis.submitReview(owner, repo, number, {
        event: 'APPROVE',
        body: 'LGTM'
      })

      expect(result).toEqual(mockResult)
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'APPROVE', body: 'LGTM' })
        }
      )
    })

    it('should submit request changes review', async () => {
      const mockResult = { 
        id: 1, 
        state: 'CHANGES_REQUESTED',
        body: 'Needs work'
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockResult)

      const result = await pullApis.submitReview(owner, repo, number, {
        event: 'REQUEST_CHANGES',
        body: 'Needs work'
      })

      expect(result).toEqual(mockResult)
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'REQUEST_CHANGES', body: 'Needs work' })
        }
      )
    })

    it('should submit comment review', async () => {
      const mockResult = { 
        id: 1, 
        state: 'COMMENTED',
        body: 'Just a comment'
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockResult)

      const result = await pullApis.submitReview(owner, repo, number, {
        event: 'COMMENT',
        body: 'Just a comment'
      })

      expect(result).toEqual(mockResult)
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'COMMENT', body: 'Just a comment' })
        }
      )
    })
  })

  describe('listReviews', () => {
    it('should return list of reviews', async () => {
      vi.mocked(http.githubJson).mockResolvedValue([
        {
          id: 1,
          state: 'APPROVED',
          body: 'LGTM',
          user: { login: 'dev' },
          submitted_at: '2026-01-01T00:00:00Z'
        },
        {
          id: 2,
          state: 'COMMENTED',
          body: 'Question',
          user: { login: 'qa' },
          submitted_at: '2026-01-02T00:00:00Z'
        }
      ])

      const reviews = await pullApis.listReviews(owner, repo, number)

      expect(reviews).toEqual([
        {
          id: 1,
          body: 'LGTM',
          user: 'dev',
          state: 'APPROVED',
          submittedAt: '2026-01-01T00:00:00Z'
        },
        {
          id: 2,
          body: 'Question',
          user: 'qa',
          state: 'COMMENTED',
          submittedAt: '2026-01-02T00:00:00Z'
        }
      ])
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/reviews?per_page=100`
      )
    })
  })

  describe('listPullRequestCommits', () => {
    it('should map pull request commits', async () => {
      vi.mocked(http.githubJson).mockResolvedValue([
        {
          sha: 'abc123def456',
          commit: {
            message: 'Fix bug\n\nDetails here',
            author: { name: 'Ada', email: 'ada@test.com', date: '2026-01-02T10:00:00Z' }
          },
          author: { login: 'ada' }
        }
      ])

      const commits = await pullApis.listPullRequestCommits(owner, repo, number)

      expect(commits).toEqual([
        {
          sha: 'abc123def456',
          subject: 'Fix bug',
          message: 'Fix bug\n\nDetails here',
          authorName: 'Ada',
          authorLogin: 'ada',
          committedAt: '2026-01-02T10:00:00Z'
        }
      ])
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/commits`
      )
    })
  })

  describe('postPullRequestReviewComment', () => {
    it('should post a review comment on a specific line', async () => {
      vi.mocked(http.githubJson).mockResolvedValue({ id: 1 })

      await pullApis.postPullRequestReviewComment(owner, repo, number, {
        body: 'Nit: rename this',
        commitId: 'headsha',
        path: 'src/a.ts',
        line: 12,
        side: 'RIGHT'
      })

      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: 'Nit: rename this',
            commit_id: 'headsha',
            path: 'src/a.ts',
            line: 12,
            side: 'RIGHT'
          })
        }
      )
    })

    it('attaches the comment to an existing pending review', async () => {
      vi.mocked(http.githubJson).mockResolvedValue({ id: 1 })

      await pullApis.postPullRequestReviewComment(
        owner,
        repo,
        number,
        {
          body: 'Nit: rename this',
          commitId: 'headsha',
          path: 'src/a.ts',
          line: 12,
          side: 'RIGHT'
        },
        99
      )

      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/comments`,
        expect.objectContaining({
          body: JSON.stringify({
            body: 'Nit: rename this',
            commit_id: 'headsha',
            path: 'src/a.ts',
            line: 12,
            side: 'RIGHT',
            pull_request_review_id: 99
          })
        })
      )
    })
  })

  describe('findPendingPullRequestReviewId', () => {
    it('returns the pending review id for the current user', async () => {
      vi.mocked(http.githubJson).mockResolvedValue([
        {
          id: 99,
          body: '',
          user: { login: 'dev' },
          state: 'PENDING',
          submitted_at: '2026-01-01T00:00:00Z'
        }
      ])

      const reviewId = await pullApis.findPendingPullRequestReviewId(owner, repo, number, 'dev')

      expect(reviewId).toBe(99)
    })
  })

  describe('getPullRequest', () => {
    it('should fetch a single pull request', async () => {
      const mockPr = {
        number: 42,
        title: 'Feature',
        state: 'open',
        html_url: 'https://github.com/owner/repo/pull/42',
        user: { login: 'user1' },
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        body: 'Body',
        draft: false,
        mergeable: true
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockPr)

      const result = await pullApis.getPullRequest(owner, repo, 42)

      expect(result).toEqual({
        number: 42,
        title: 'Feature',
        state: 'open',
        htmlUrl: 'https://github.com/owner/repo/pull/42',
        repository: { owner: 'owner', repo: 'repo' },
        user: 'user1',
        head: { ref: 'feature', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        body: 'Body',
        draft: false,
        mergeable: true
      })
      expect(http.githubJson).toHaveBeenCalledWith(`/repos/${owner}/${repo}/pulls/42`)
    })
  })

  describe('listPullRequestFiles', () => {
    it('should map pull request file changes', async () => {
      vi.mocked(http.githubJson).mockResolvedValue([
        {
          filename: 'src/a.ts',
          status: 'modified',
          additions: 3,
          deletions: 1,
          changes: 4
        },
        {
          filename: 'src/b.ts',
          status: 'added',
          additions: 10,
          deletions: 0,
          changes: 10
        }
      ])

      const files = await pullApis.listPullRequestFiles(owner, repo, number)

      expect(files).toEqual([
        {
          path: 'src/a.ts',
          status: 'modified',
          additions: 3,
          deletions: 1,
          changes: 4
        },
        {
          path: 'src/b.ts',
          status: 'added',
          additions: 10,
          deletions: 0,
          changes: 10
        }
      ])
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/files`
      )
    })
  })

  describe('postPullRequestConversationComment', () => {
    it('should post a conversation comment on the pull request issue', async () => {
      vi.mocked(http.githubJson).mockResolvedValue({ id: 1 })

      await pullApis.postPullRequestConversationComment(owner, repo, number, 'Hello')

      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/issues/${number}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: 'Hello' })
        }
      )
    })
  })

  describe('dismissReview', () => {
    it('should dismiss a review', async () => {
      const mockResult = { 
        id: 1, 
        state: 'DISMISSED',
        body: 'Dismissed'
      }
      vi.mocked(http.githubJson).mockResolvedValue(mockResult)

      const result = await pullApis.dismissReview(owner, repo, number, 1, 'No longer needed')

      expect(result).toEqual(mockResult)
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/reviews/1/dismissals`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'No longer needed' })
        }
      )
    })
  })

  describe('listPullRequests', () => {
    it('maps open pull requests from the API', async () => {
      vi.mocked(http.githubJson).mockResolvedValue([
        {
          number: 7,
          title: 'Add feature',
          state: 'open',
          html_url: 'https://github.com/owner/repo/pull/7',
          user: { login: 'dev' },
          head: { ref: 'feature', sha: 'abc' },
          base: { ref: 'main', sha: 'def' },
          body: 'Summary',
          draft: false,
          mergeable: true
        }
      ])

      const pulls = await pullApis.listPullRequests(owner, repo)

      expect(pulls[0]).toMatchObject({
        number: 7,
        title: 'Add feature',
        user: 'dev',
        head: { ref: 'feature', sha: 'abc' },
        base: { ref: 'main', sha: 'def' }
      })
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls?state=open&per_page=100`
      )
    })
  })

  describe('createPullRequest', () => {
    it('creates a pull request with optional draft flag', async () => {
      vi.mocked(http.githubJson).mockResolvedValue({
        number: 8,
        title: 'Draft PR',
        state: 'open',
        html_url: 'https://github.com/owner/repo/pull/8',
        user: { login: 'dev' },
        head: { ref: 'feature', sha: 'abc' },
        base: { ref: 'main', sha: 'def' },
        body: 'Body',
        draft: true,
        mergeable: null
      })

      const pull = await pullApis.createPullRequest(owner, repo, {
        title: 'Draft PR',
        head: 'feature',
        base: 'main',
        body: 'Body',
        draft: true
      })

      expect(pull.number).toBe(8)
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Draft PR',
            head: 'feature',
            base: 'main',
            body: 'Body',
            draft: true
          })
        })
      )
    })
  })
})