import type { IpcMain } from 'electron'
import {
  connectGitHub,
  connectGitHubPat,
  createGitHubIssue,
  createGitHubPullRequest,
  createGitHubRepo,
  disconnectGitHub,
  forkGitHubRepo,
  getGitHubPullRequest,
  getGitHubStatus,
  listGitHubIssues,
  listGitHubPullRequestFiles,
  listGitHubPullRequestCommits,
  listGitHubPullRequestConversationComments,
  listGitHubPullRequestReviewComments,
  listGitHubPullRequestReviews,
  listGitHubPullRequestReviewThreads,
  listGitHubPullRequests,
  listGitHubRepos,
  mergeGitHubPullRequest,
  postGitHubPullRequestComment,
  postGitHubPullRequestReviewComment,
  replyGitHubPullRequestReviewComment,
  reopenGitHubPullRequest,
  resolveGitHubPullRequestReviewThread,
  tryGetGitHubRepoContext,
  unresolveGitHubPullRequestReviewThread,
  updateGitHubIssue,
  uploadGitHubSshKey
} from '../../github/service'
import type { SettingsRef } from './types'

export function registerGitHubIpc(ipcMain: IpcMain, sr: SettingsRef): void {
  ipcMain.handle('gitfreddo:github-get-status', async () => {
    const result = await getGitHubStatus(sr.get())
    sr.set(result.settings)
    return result.status
  })

  ipcMain.handle('gitfreddo:github-connect', async (event) => {
    const result = await connectGitHub((progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('gitfreddo:github-connect-progress', progress)
      }
    })
    sr.set(result.settings)
    return result.status
  })

  ipcMain.handle('gitfreddo:github-connect-pat', async (_event, token: string) => {
    const result = await connectGitHubPat(token)
    sr.set(result.settings)
    return result.status
  })

  ipcMain.handle('gitfreddo:github-disconnect', async () => {
    sr.set(await disconnectGitHub(sr.get()))
  })

  ipcMain.handle('gitfreddo:github-list-repos', async (_event, params) => listGitHubRepos(params))

  ipcMain.handle('gitfreddo:github-create-repo', async (_event, params) => createGitHubRepo(params))

  ipcMain.handle('gitfreddo:github-fork-repo', async (_event, owner: string, repo: string) =>
    forkGitHubRepo(owner, repo)
  )

  ipcMain.handle('gitfreddo:github-upload-ssh-key', async (_event, title: string) => {
    const uploaded = await uploadGitHubSshKey(sr.get(), title)
    sr.set(uploaded.settings)
    return uploaded.result
  })

  ipcMain.handle('gitfreddo:github-get-repo-context', async (_event, repoPath: string) =>
    tryGetGitHubRepoContext(repoPath, sr.get())
  )

  ipcMain.handle('gitfreddo:github-list-pull-requests', async (_event, repoPath: string) =>
    listGitHubPullRequests(repoPath, sr.get())
  )

  ipcMain.handle('gitfreddo:github-get-pull-request', async (
    _event,
    repoPath: string,
    number: number,
    repository
  ) => getGitHubPullRequest(repoPath, sr.get(), number, repository))

  ipcMain.handle('gitfreddo:github-list-pull-request-files', async (
    _event,
    repoPath: string,
    number: number,
    repository
  ) => listGitHubPullRequestFiles(repoPath, sr.get(), number, repository))

  ipcMain.handle('gitfreddo:github-list-pull-request-commits', async (
    _event,
    repoPath: string,
    number: number,
    repository
  ) => listGitHubPullRequestCommits(repoPath, sr.get(), number, repository))

  ipcMain.handle('gitfreddo:github-list-pull-request-conversation-comments', async (
    _event,
    repoPath: string,
    number: number,
    repository
  ) => listGitHubPullRequestConversationComments(repoPath, sr.get(), number, repository))

  ipcMain.handle('gitfreddo:github-list-pull-request-review-comments', async (
    _event,
    repoPath: string,
    number: number,
    repository
  ) => listGitHubPullRequestReviewComments(repoPath, sr.get(), number, repository))

  ipcMain.handle('gitfreddo:github-list-pull-request-reviews', async (
    _event,
    repoPath: string,
    number: number,
    repository
  ) => listGitHubPullRequestReviews(repoPath, sr.get(), number, repository))

  ipcMain.handle('gitfreddo:github-list-pull-request-review-threads', async (
    _event,
    repoPath: string,
    number: number,
    repository
  ) => listGitHubPullRequestReviewThreads(repoPath, sr.get(), number, repository))

  ipcMain.handle('gitfreddo:github-create-pull-request', async (_event, repoPath: string, params) =>
    createGitHubPullRequest(repoPath, sr.get(), params)
  )

  ipcMain.handle('gitfreddo:github-merge-pull-request', async (
    _event,
    repoPath: string,
    number: number,
    method
  ) => mergeGitHubPullRequest(repoPath, sr.get(), number, method))

  ipcMain.handle('gitfreddo:github-reopen-pull-request', async (
    _event,
    repoPath: string,
    number: number
  ) => reopenGitHubPullRequest(repoPath, sr.get(), number))

  ipcMain.handle('gitfreddo:github-post-pull-request-comment', async (
    _event,
    repoPath: string,
    number: number,
    body: string,
    repository
  ) => postGitHubPullRequestComment(repoPath, sr.get(), number, body, repository))

  ipcMain.handle('gitfreddo:github-post-pull-request-review-comment', async (
    _event,
    repoPath: string,
    number: number,
    params,
    repository
  ) => postGitHubPullRequestReviewComment(repoPath, sr.get(), number, params, repository))

  ipcMain.handle('gitfreddo:github-reply-pull-request-review-comment', async (
    _event,
    repoPath: string,
    number: number,
    commentId: number,
    body: string,
    repository
  ) => replyGitHubPullRequestReviewComment(repoPath, sr.get(), number, commentId, body, repository))

  ipcMain.handle('gitfreddo:github-resolve-pull-request-review-thread', async (
    _event,
    repoPath: string,
    threadId: string
  ) => resolveGitHubPullRequestReviewThread(repoPath, sr.get(), threadId))

  ipcMain.handle('gitfreddo:github-unresolve-pull-request-review-thread', async (
    _event,
    repoPath: string,
    threadId: string
  ) => unresolveGitHubPullRequestReviewThread(repoPath, sr.get(), threadId))

  ipcMain.handle(
    'gitfreddo:github-list-issues',
    async (_event, repoPath: string, assigneeLogin?: string) =>
      listGitHubIssues(repoPath, sr.get(), assigneeLogin)
  )

  ipcMain.handle('gitfreddo:github-create-issue', async (_event, repoPath: string, params) =>
    createGitHubIssue(repoPath, sr.get(), params)
  )

  ipcMain.handle('gitfreddo:github-update-issue', async (
    _event,
    repoPath: string,
    number: number,
    params
  ) => updateGitHubIssue(repoPath, sr.get(), number, params))
}
