import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { GitIpcMethod } from '@shared/git/ipc'
import { gitIpcInvalidates } from '@shared/git/ipc'
import { useInvalidateGit } from '@/hooks/useInvalidateGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { useOperationStore, showHookExecutionToast } from '@/stores/operation'

const REMOTE_ACTION_KEYS: Record<string, { success: string; error: string }> = {
  fetch: { success: 'toast.fetch.success', error: 'toast.fetch.error' },
  push: { success: 'toast.push.success', error: 'toast.push.error' },
  pull: { success: 'toast.pull.success', error: 'toast.pull.error' },
  'tag.push': { success: 'toast.tagPush.success', error: 'toast.tagPush.error' }
}

export function useGitMutations() {
  const { t } = useTranslation()
  const invalidate = useInvalidateGit()
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const showToast = useToastStore((s) => s.show)

  const wrap = <M extends GitIpcMethod>(method: M, invalidateKeys?: string[]) => {
    const remoteAction = REMOTE_ACTION_KEYS[method]
    const keys = invalidateKeys ?? [...gitIpcInvalidates(method)]

    return useMutation({
      mutationFn: async (params?: unknown) => {
        if (!repoPath) throw new Error(t('toast.noRepoConnected'))
        return window.gitfreddo.invoke(method, params as never)
      },
      onMutate: () => {
        useOperationStore.getState().begin()
      },
      onSettled: (_data, error) => {
        window.setTimeout(() => {
          const { hookResult, end } = useOperationStore.getState()
          if (hookResult) {
            showHookExecutionToast(showToast, t, hookResult)
          } else if (error && remoteAction) {
            const message = error instanceof Error ? error.message : String(error)
            showToast(message || t(remoteAction.error), 'error')
          }
          end()
        }, 0)
      },
      onSuccess: () => {
        invalidate(...keys)
        if (remoteAction) {
          showToast(t(remoteAction.success), 'success')
        }
      },
      onError: () => {
        // Hook-aware errors are toasted from onSettled after operation logs arrive.
      }
    })
  }

  return {
    checkout: wrap('branch.checkout'),
    createBranch: wrap('branch.create'),
    deleteBranch: wrap('branch.delete'),
    renameBranch: wrap('branch.rename'),
    checkoutRemote: wrap('branch.checkoutRemote'),
    setUpstream: wrap('branch.setUpstream'),
    unsetUpstream: wrap('branch.unsetUpstream'),
    deleteRemoteBranch: wrap('branch.deleteRemote'),
    stageAdd: wrap('stage.add'),
    stageReset: wrap('stage.reset'),
    workingDiscard: wrap('working.discard'),
    workingRemove: wrap('working.remove'),
    workingClean: wrap('working.clean'),
    workingRename: wrap('working.rename'),
    workingAddToGitignore: wrap('working.addToGitignore'),
    submoduleAdd: wrap('submodule.add'),
    submoduleInit: wrap('submodule.init'),
    submoduleUpdate: wrap('submodule.update'),
    submoduleSync: wrap('submodule.sync'),
    submoduleDeinit: wrap('submodule.deinit'),
    submoduleRemove: wrap('submodule.remove'),
    submoduleSetUrl: wrap('submodule.setUrl'),
    stageApplyPatch: wrap('stage.applyPatch'),
    commit: wrap('commit.create'),
    rewordCommit: wrap('commit.reword'),
    fetch: wrap('fetch'),
    push: wrap('push'),
    pull: wrap('pull'),
    merge: wrap('merge.start'),
    mergeAbort: wrap('merge.abort'),
    mergeContinue: wrap('merge.continue'),
    rebaseStart: wrap('rebase.start'),
    rebaseInteractive: wrap('rebase.interactive'),
    rebaseAbort: wrap('rebase.abort'),
    rebaseContinue: wrap('rebase.continue'),
    rebaseSkip: wrap('rebase.skip'),
    cherryPickContinue: wrap('cherry-pick.continue'),
    cherryPickAbort: wrap('cherry-pick.abort'),
    cherryPickSkip: wrap('cherry-pick.skip'),
    cherryPick: wrap('cherry-pick'),
    squashCommits: wrap('rebase.squash'),
    dropCommits: wrap('rebase.drop'),
    revertCommit: wrap('commit.revert'),
    reset: wrap('reset'),
    resetHead: wrap('reset.head'),
    undoLast: wrap('undo.last'),
    stashPush: wrap('stash.push'),
    stashPop: wrap('stash.pop'),
    stashApply: wrap('stash.apply'),
    stashDrop: wrap('stash.drop'),
    worktreeAdd: wrap('worktree.add'),
    worktreeRemove: wrap('worktree.remove'),
    worktreePrune: wrap('worktree.prune'),
    remoteAdd: wrap('remote.add'),
    remoteRemove: wrap('remote.remove'),
    remoteRename: wrap('remote.rename'),
    remoteSetUrl: wrap('remote.setUrl'),
    createTag: wrap('tag.create'),
    deleteTag: wrap('tag.delete'),
    renameTag: wrap('tag.rename'),
    pushTag: wrap('tag.push'),
    stashBranch: wrap('stash.branch'),
    bisectStart: wrap('bisect.start'),
    bisectGood: wrap('bisect.good'),
    bisectBad: wrap('bisect.bad'),
    bisectReset: wrap('bisect.reset'),
    notesAdd: wrap('notes.add')
  }
}
