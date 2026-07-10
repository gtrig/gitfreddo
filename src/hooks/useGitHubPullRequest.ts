import { useMemo } from 'react'
import { useQuery, useQueryClient, useQueries } from '@tanstack/react-query'
import type {
  GitHubPullRequest,
  GitHubPullRequestCommit,
  GitHubPullRequestFile,
  GitHubPullRequestRepository,
  GitHubPullRequestTimelineItem
} from '@shared/github'
import { mergePullRequestTimeline } from '@/lib/github/prTimeline'

function hasPullRepository(repository: GitHubPullRequestRepository | null | undefined): boolean {
  return Boolean(repository?.owner && repository.repo)
}

export function useGitHubPullRequest(
  repoPath: string | null,
  number: number | null,
  repository: GitHubPullRequestRepository | null | undefined,
  enabled = true
) {
  return useQuery<GitHubPullRequest>({
    queryKey: ['github-pull-request', repoPath, number, repository?.owner, repository?.repo],
    queryFn: () => {
      if (!repoPath || number === null) {
        throw new Error('Repository and pull request number are required')
      }
      return window.gitfreddo.githubGetPullRequest(
        repoPath,
        number,
        hasPullRepository(repository) ? repository! : undefined
      )
    },
    enabled: enabled && Boolean(repoPath) && number !== null,
    staleTime: 30_000
  })
}

export function useGitHubPullRequestFiles(
  repoPath: string | null,
  number: number | null,
  repository: GitHubPullRequestRepository | null | undefined,
  enabled = true
) {
  return useQuery<GitHubPullRequestFile[]>({
    queryKey: ['github-pull-request-files', repoPath, number, repository?.owner, repository?.repo],
    queryFn: () => {
      if (!repoPath || number === null) {
        throw new Error('Repository and pull request number are required')
      }
      return window.gitfreddo.githubListPullRequestFiles(
        repoPath,
        number,
        hasPullRepository(repository) ? repository! : undefined
      )
    },
    enabled: enabled && Boolean(repoPath) && number !== null,
    staleTime: 30_000
  })
}

export function useGitHubPullRequestCommits(
  repoPath: string | null,
  number: number | null,
  repository: GitHubPullRequestRepository | null | undefined,
  enabled = true
) {
  return useQuery<GitHubPullRequestCommit[]>({
    queryKey: ['github-pull-request-commits', repoPath, number, repository?.owner, repository?.repo],
    queryFn: () => {
      if (!repoPath || number === null) {
        throw new Error('Repository and pull request number are required')
      }
      return window.gitfreddo.githubListPullRequestCommits(
        repoPath,
        number,
        hasPullRepository(repository) ? repository! : undefined
      )
    },
    enabled: enabled && Boolean(repoPath) && number !== null,
    staleTime: 30_000
  })
}

export function useGitHubPullRequestTimeline(
  repoPath: string | null,
  number: number | null,
  repository: GitHubPullRequestRepository | null | undefined,
  enabled = true
) {
  const active = enabled && Boolean(repoPath) && number !== null
  const repoKey = hasPullRepository(repository) ? repository! : undefined

  const [conversationQuery, lineCommentsQuery, reviewsQuery] = useQueries({
    queries: [
      {
        queryKey: [
          'github-pull-request-conversation-comments',
          repoPath,
          number,
          repository?.owner,
          repository?.repo
        ],
        queryFn: () => {
          if (!repoPath || number === null) {
            throw new Error('Repository and pull request number are required')
          }
          return window.gitfreddo.githubListPullRequestConversationComments(repoPath, number, repoKey)
        },
        enabled: active,
        staleTime: 30_000
      },
      {
        queryKey: [
          'github-pull-request-review-comments',
          repoPath,
          number,
          repository?.owner,
          repository?.repo
        ],
        queryFn: () => {
          if (!repoPath || number === null) {
            throw new Error('Repository and pull request number are required')
          }
          return window.gitfreddo.githubListPullRequestReviewComments(repoPath, number, repoKey)
        },
        enabled: active,
        staleTime: 30_000
      },
      {
        queryKey: ['github-pull-request-reviews', repoPath, number, repository?.owner, repository?.repo],
        queryFn: () => {
          if (!repoPath || number === null) {
            throw new Error('Repository and pull request number are required')
          }
          return window.gitfreddo.githubListPullRequestReviews(repoPath, number, repoKey)
        },
        enabled: active,
        staleTime: 30_000
      }
    ]
  })

  const timeline = useMemo(() => {
    if (
      conversationQuery.isLoading ||
      lineCommentsQuery.isLoading ||
      reviewsQuery.isLoading
    ) {
      return [] as GitHubPullRequestTimelineItem[]
    }
    return mergePullRequestTimeline(
      conversationQuery.data ?? [],
      lineCommentsQuery.data ?? [],
      reviewsQuery.data ?? []
    )
  }, [
    conversationQuery.isLoading,
    conversationQuery.data,
    lineCommentsQuery.isLoading,
    lineCommentsQuery.data,
    reviewsQuery.isLoading,
    reviewsQuery.data
  ])

  return {
    data: timeline,
    isLoading:
      conversationQuery.isLoading || lineCommentsQuery.isLoading || reviewsQuery.isLoading,
    error: (conversationQuery.error ??
      lineCommentsQuery.error ??
      reviewsQuery.error) as Error | null
  }
}

export function useInvalidateGitHubPullRequestDetail() {
  const queryClient = useQueryClient()
  return (repoPath: string | null, number: number) => {
    void queryClient.invalidateQueries({ queryKey: ['github-pull-request', repoPath, number] })
    void queryClient.invalidateQueries({
      queryKey: ['github-pull-request-files', repoPath, number]
    })
    void queryClient.invalidateQueries({
      queryKey: ['github-pull-request-commits', repoPath, number]
    })
    void queryClient.invalidateQueries({
      queryKey: ['github-pull-request-conversation-comments', repoPath, number]
    })
    void queryClient.invalidateQueries({
      queryKey: ['github-pull-request-review-comments', repoPath, number]
    })
    void queryClient.invalidateQueries({
      queryKey: ['github-pull-request-reviews', repoPath, number]
    })
    void queryClient.invalidateQueries({ queryKey: ['github-pull-requests', repoPath] })
  }
}
