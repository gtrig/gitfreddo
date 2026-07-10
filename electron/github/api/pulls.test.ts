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

  describe('listComments', () => {
    it('should return list of comments', async () => {
      const mockComments = [{ id: 1, body: 'Comment 1' }]
      vi.mocked(http.githubJson).mockResolvedValue(mockComments)

      const comments = await pullApis.listComments(owner, repo, number)

      expect(comments).toEqual(mockComments)
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/comments`
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
      const mockReviews = [
        { id: 1, state: 'APPROVED', body: 'LGTM' },
        { id: 2, state: 'COMMENTED', body: 'Question' }
      ]
      vi.mocked(http.githubJson).mockResolvedValue(mockReviews)

      const reviews = await pullApis.listReviews(owner, repo, number)

      expect(reviews).toEqual(mockReviews)
      expect(http.githubJson).toHaveBeenCalledWith(
        `/repos/${owner}/${repo}/pulls/${number}/reviews`
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
})