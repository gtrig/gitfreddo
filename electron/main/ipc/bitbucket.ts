import type { IpcMain } from 'electron'
import {
  connectBitbucket,
  connectBitbucketAppPassword,
  createBitbucketIssue,
  createBitbucketPullRequest,
  createBitbucketRepo,
  disconnectBitbucket,
  forkBitbucketRepo,
  getBitbucketStatus,
  listBitbucketIssues,
  listBitbucketPullRequests,
  listBitbucketRepos,
  listBitbucketWorkspaces,
  mergeBitbucketPullRequest,
  tryGetBitbucketRepoContext,
  updateBitbucketIssue,
  uploadBitbucketSshKey
} from '../../bitbucket/service'
import type { SettingsRef } from './types'

export function registerBitbucketIpc(ipcMain: IpcMain, sr: SettingsRef): void {
  ipcMain.handle('gitfreddo:bitbucket-get-status', async () => {
    const result = await getBitbucketStatus(sr.get())
    sr.set(result.settings)
    return result.status
  })

  ipcMain.handle('gitfreddo:bitbucket-connect', async (event) => {
    const result = await connectBitbucket((progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('gitfreddo:bitbucket-connect-progress', progress)
      }
    })
    sr.set(result.settings)
    return result.status
  })

  ipcMain.handle(
    'gitfreddo:bitbucket-connect-app-password',
    async (_event, username: string, password: string) => {
      const result = await connectBitbucketAppPassword(username, password)
      sr.set(result.settings)
      return result.status
    }
  )

  ipcMain.handle('gitfreddo:bitbucket-disconnect', async () => {
    sr.set(await disconnectBitbucket(sr.get()))
  })

  ipcMain.handle('gitfreddo:bitbucket-list-repos', async (_event, params) =>
    listBitbucketRepos(sr.get(), params)
  )

  ipcMain.handle('gitfreddo:bitbucket-list-workspaces', async () =>
    listBitbucketWorkspaces(sr.get())
  )

  ipcMain.handle('gitfreddo:bitbucket-create-repo', async (_event, params) =>
    createBitbucketRepo(sr.get(), params)
  )

  ipcMain.handle('gitfreddo:bitbucket-fork-repo', async (_event, workspace: string, repo: string) =>
    forkBitbucketRepo(sr.get(), workspace, repo)
  )

  ipcMain.handle('gitfreddo:bitbucket-upload-ssh-key', async (_event, title: string) => {
    const uploaded = await uploadBitbucketSshKey(sr.get(), title)
    sr.set(uploaded.settings)
    return uploaded.result
  })

  ipcMain.handle('gitfreddo:bitbucket-get-repo-context', async (_event, repoPath: string) =>
    tryGetBitbucketRepoContext(repoPath, sr.get())
  )

  ipcMain.handle('gitfreddo:bitbucket-list-pull-requests', async (_event, repoPath: string) =>
    listBitbucketPullRequests(repoPath, sr.get())
  )

  ipcMain.handle(
    'gitfreddo:bitbucket-create-pull-request',
    async (_event, repoPath: string, params) =>
      createBitbucketPullRequest(repoPath, sr.get(), params)
  )

  ipcMain.handle(
    'gitfreddo:bitbucket-merge-pull-request',
    async (_event, repoPath: string, number: number, method) =>
      mergeBitbucketPullRequest(repoPath, sr.get(), number, method)
  )

  ipcMain.handle(
    'gitfreddo:bitbucket-list-issues',
    async (_event, repoPath: string, assigneeLogin?: string) =>
      listBitbucketIssues(repoPath, sr.get(), assigneeLogin)
  )

  ipcMain.handle('gitfreddo:bitbucket-create-issue', async (_event, repoPath: string, params) =>
    createBitbucketIssue(repoPath, sr.get(), params)
  )

  ipcMain.handle(
    'gitfreddo:bitbucket-update-issue',
    async (_event, repoPath: string, number: number, params) =>
      updateBitbucketIssue(repoPath, sr.get(), number, params)
  )
}
