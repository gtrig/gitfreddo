import { useMutation } from '@tanstack/react-query'
import { useInvalidateGit } from '@/hooks/useInvalidateGit'
import { useWorkspaceStore } from '@/stores/workspace'

export function useGitMutations() {
  const invalidate = useInvalidateGit()
  const repoPath = useWorkspaceStore((s) => s.activePath)

  const wrap = (method: string, invalidateKeys: string[] = []) => {
    return useMutation({
      mutationFn: async (params?: unknown) => {
        if (!repoPath) throw new Error('No repository connected')
        return window.gitfredo.invoke(method, params)
      },
      onSuccess: () => {
        invalidate(...invalidateKeys)
      }
    })
  }

  return {
    checkout: wrap('branch.checkout', ['branch.list', 'working.status', 'log.graph', 'status']),
    createBranch: wrap('branch.create', ['branch.list']),
    deleteBranch: wrap('branch.delete', ['branch.list']),
    stageAdd: wrap('stage.add', ['working.status']),
    stageReset: wrap('stage.reset', ['working.status']),
    commit: wrap('commit.create', ['working.status', 'log.graph', 'status']),
    fetch: wrap('fetch', ['branch.list', 'log.graph', 'working.status']),
    push: wrap('push', ['branch.list', 'working.status']),
    pull: wrap('pull', ['branch.list', 'log.graph', 'working.status']),
    merge: wrap('merge.start', ['branch.list', 'working.status', 'log.graph', 'merge.status']),
    mergeAbort: wrap('merge.abort', ['working.status', 'merge.status']),
    mergeContinue: wrap('merge.continue', ['working.status', 'log.graph', 'merge.status']),
    rebaseStart: wrap('rebase.start', ['branch.list', 'working.status', 'log.graph']),
    rebaseAbort: wrap('rebase.abort', ['working.status']),
    rebaseContinue: wrap('rebase.continue', ['working.status', 'log.graph']),
    cherryPick: wrap('cherry-pick', ['working.status', 'log.graph']),
    stashPush: wrap('stash.push', ['working.status', 'stash.list']),
    stashPop: wrap('stash.pop', ['working.status', 'stash.list']),
    stashApply: wrap('stash.apply', ['working.status']),
    stashDrop: wrap('stash.drop', ['stash.list']),
    remoteAdd: wrap('remote.add', ['remote.list']),
    remoteRemove: wrap('remote.remove', ['remote.list'])
  }
}
