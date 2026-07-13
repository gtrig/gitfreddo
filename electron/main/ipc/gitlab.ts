import type { IpcMain } from 'electron'
import {
  connectGitlab,
  connectGitlabPat,
  createGitlabIssue,
  createGitlabPullRequest,
  createGitlabRepo,
  disconnectGitlab,
  forkGitlabRepo,
  getGitlabStatus,
  listGitlabIssues,
  listGitlabNamespaces,
  listGitlabPullRequests,
  listGitlabRepos,
  mergeGitlabPullRequest,
  tryGetGitlabRepoContext,
  updateGitlabIssue,
  uploadGitlabSshKey
} from '../../gitlab/service'
import type { SettingsRef } from './types'

export function registerGitlabIpc(ipcMain: IpcMain, sr: SettingsRef): void {
  ipcMain.handle('gitfreddo:gitlab-get-status', async () => {
    const result = await getGitlabStatus(sr.get())
    sr.set(result.settings)
    return result.status
  })

  ipcMain.handle('gitfreddo:gitlab-connect', async (event) => {
    const result = await connectGitlab((progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('gitfreddo:gitlab-connect-progress', progress)
      }
    })
    sr.set(result.settings)
    return result.status
  })

  ipcMain.handle(
    'gitfreddo:gitlab-connect-pat',
    async (_event, token: string, host?: string) => {
      const result = await connectGitlabPat(token, host)
      sr.set(result.settings)
      return result.status
    }
  )

  ipcMain.handle('gitfreddo:gitlab-disconnect', async () => {
    sr.set(await disconnectGitlab(sr.get()))
  })

  ipcMain.handle('gitfreddo:gitlab-list-repos', async (_event, params) =>
    listGitlabRepos(sr.get(), params)
  )

  ipcMain.handle('gitfreddo:gitlab-list-namespaces', async () =>
    listGitlabNamespaces(sr.get())
  )

  ipcMain.handle('gitfreddo:gitlab-create-repo', async (_event, params) =>
    createGitlabRepo(sr.get(), params)
  )

  ipcMain.handle('gitfreddo:gitlab-fork-repo', async (_event, namespace: string, repo: string) =>
    forkGitlabRepo(sr.get(), namespace, repo)
  )

  ipcMain.handle('gitfreddo:gitlab-upload-ssh-key', async (_event, title: string) => {
    const uploaded = await uploadGitlabSshKey(sr.get(), title)
    sr.set(uploaded.settings)
    return uploaded.result
  })

  ipcMain.handle('gitfreddo:gitlab-get-repo-context', async (_event, repoPath: string) =>
    tryGetGitlabRepoContext(repoPath, sr.get())
  )

  ipcMain.handle('gitfreddo:gitlab-list-pull-requests', async (_event, repoPath: string) =>
    listGitlabPullRequests(repoPath, sr.get())
  )

  ipcMain.handle(
    'gitfreddo:gitlab-create-pull-request',
    async (_event, repoPath: string, params) =>
      createGitlabPullRequest(repoPath, sr.get(), params)
  )

  ipcMain.handle(
    'gitfreddo:gitlab-merge-pull-request',
    async (_event, repoPath: string, number: number, method) =>
      mergeGitlabPullRequest(repoPath, sr.get(), number, method)
  )

  ipcMain.handle(
    'gitfreddo:gitlab-list-issues',
    async (_event, repoPath: string, assigneeLogin?: string) =>
      listGitlabIssues(repoPath, sr.get(), assigneeLogin)
  )

  ipcMain.handle('gitfreddo:gitlab-create-issue', async (_event, repoPath: string, params) =>
    createGitlabIssue(repoPath, sr.get(), params)
  )

  ipcMain.handle(
    'gitfreddo:gitlab-update-issue',
    async (_event, repoPath: string, number: number, params) =>
      updateGitlabIssue(repoPath, sr.get(), number, params)
  )
}
