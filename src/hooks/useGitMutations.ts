import { useMutation } from '@tanstack/react-query'
import { useInvalidateGit } from '@/hooks/useInvalidateGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'

const REMOTE_ACTION_LABELS: Record<string, { success: string; error: string }> = {
  fetch: { success: 'Fetched from remote', error: 'Fetch failed' },
  push: { success: 'Pushed to remote', error: 'Push failed' },
  pull: { success: 'Pulled from remote', error: 'Pull failed' },
  'tag.push': { success: 'Tag pushed to remote', error: 'Tag push failed' }
}

export function useGitMutations() {
  const invalidate = useInvalidateGit()
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const showToast = useToastStore((s) => s.show)

  const wrap = (method: string, invalidateKeys: string[] = []) => {
    const remoteAction = REMOTE_ACTION_LABELS[method]

    return useMutation({
      mutationFn: async (params?: unknown) => {
        if (!repoPath) throw new Error('No repository connected')
        return window.gitfredo.invoke(method, params)
      },
      onSuccess: () => {
        invalidate(...invalidateKeys)
        if (remoteAction) {
          showToast(remoteAction.success, 'success')
        }
      },
      onError: (error) => {
        if (remoteAction) {
          const message = error instanceof Error ? error.message : String(error)
          showToast(message || remoteAction.error, 'error')
        }
      }
    })
  }

  return {
    checkout: wrap('branch.checkout', ['branch.list', 'working.status', 'log.graph', 'status']),
    createBranch: wrap('branch.create', ['branch.list']),
    deleteBranch: wrap('branch.delete', ['branch.list']),
    renameBranch: wrap('branch.rename', ['branch.list', 'log.graph']),
    checkoutRemote: wrap('branch.checkoutRemote', ['branch.list', 'working.status', 'log.graph', 'status']),
    setUpstream: wrap('branch.setUpstream', ['branch.list']),
    unsetUpstream: wrap('branch.unsetUpstream', ['branch.list']),
    deleteRemoteBranch: wrap('branch.deleteRemote', ['branch.list']),
    stageAdd: wrap('stage.add', ['working.status']),
    stageReset: wrap('stage.reset', ['working.status']),
    workingDiscard: wrap('working.discard', ['working.status']),
    workingRemove: wrap('working.remove', ['working.status']),
    workingClean: wrap('working.clean', ['working.status']),
    workingRename: wrap('working.rename', ['working.status']),
    stageApplyPatch: wrap('stage.applyPatch', ['working.status']),
    commit: wrap('commit.create', ['working.status', 'log.graph', 'status']),
    rewordCommit: wrap('commit.reword', ['working.status', 'log.graph', 'status']),
    fetch: wrap('fetch', ['branch.list', 'log.graph', 'working.status', 'tag.list']),
    push: wrap('push', ['branch.list', 'working.status']),
    pull: wrap('pull', ['branch.list', 'log.graph', 'working.status']),
    merge: wrap('merge.start', ['branch.list', 'working.status', 'log.graph', 'merge.status']),
    mergeAbort: wrap('merge.abort', ['working.status', 'merge.status']),
    mergeContinue: wrap('merge.continue', ['working.status', 'log.graph', 'merge.status']),
    rebaseStart: wrap('rebase.start', ['branch.list', 'working.status', 'log.graph', 'merge.status']),
    rebaseInteractive: wrap('rebase.interactive', ['working.status', 'log.graph', 'status', 'branch.list']),
    rebaseAbort: wrap('rebase.abort', ['working.status', 'merge.status']),
    rebaseContinue: wrap('rebase.continue', ['working.status', 'log.graph', 'merge.status']),
    rebaseSkip: wrap('rebase.skip', ['working.status', 'log.graph', 'merge.status']),
    cherryPickContinue: wrap('cherry-pick.continue', ['working.status', 'log.graph', 'merge.status']),
    cherryPickAbort: wrap('cherry-pick.abort', ['working.status', 'merge.status']),
    cherryPickSkip: wrap('cherry-pick.skip', ['working.status', 'log.graph', 'merge.status']),
    cherryPick: wrap('cherry-pick', ['working.status', 'log.graph', 'merge.status']),
    squashCommits: wrap('rebase.squash', ['working.status', 'log.graph', 'status']),
    dropCommits: wrap('rebase.drop', ['working.status', 'log.graph', 'status', 'branch.list']),
    revertCommit: wrap('commit.revert', ['working.status', 'log.graph', 'status', 'branch.list']),
    reset: wrap('reset', ['working.status', 'log.graph', 'status']),
    resetHead: wrap('reset.head', ['working.status', 'log.graph', 'status', 'branch.list']),
    stashPush: wrap('stash.push', ['working.status', 'stash.list']),
    stashPop: wrap('stash.pop', ['working.status', 'stash.list']),
    stashApply: wrap('stash.apply', ['working.status']),
    stashDrop: wrap('stash.drop', ['stash.list']),
    worktreeAdd: wrap('worktree.add', ['worktree.list', 'branch.list']),
    worktreeRemove: wrap('worktree.remove', ['worktree.list', 'branch.list']),
    worktreePrune: wrap('worktree.prune', ['worktree.list']),
    remoteAdd: wrap('remote.add', ['remote.list']),
    remoteRemove: wrap('remote.remove', ['remote.list']),
    remoteRename: wrap('remote.rename', ['remote.list', 'branch.list']),
    remoteSetUrl: wrap('remote.setUrl', ['remote.list']),
    createTag: wrap('tag.create', ['tag.list', 'log.graph']),
    deleteTag: wrap('tag.delete', ['tag.list', 'log.graph']),
    renameTag: wrap('tag.rename', ['tag.list', 'log.graph']),
    pushTag: wrap('tag.push', ['tag.list']),
    stashBranch: wrap('stash.branch', ['stash.list', 'branch.list', 'working.status']),
    bisectStart: wrap('bisect.start', ['merge.status', 'working.status']),
    bisectGood: wrap('bisect.good', ['merge.status', 'log.graph']),
    bisectBad: wrap('bisect.bad', ['merge.status', 'log.graph']),
    bisectReset: wrap('bisect.reset', ['merge.status', 'log.graph', 'working.status']),
    notesAdd: wrap('notes.add', ['log.graph']),
  }
}
