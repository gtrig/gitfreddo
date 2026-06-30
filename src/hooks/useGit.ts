import { useQuery } from '@tanstack/react-query'
import type {
  GitBranch,
  GitDiffResult,
  GitLogGraphResult,
  GitMergeStatus,
  GitRemote,
  GitRepoStatus,
  GitStashEntry,
  GitWorkingStatus
} from '@/lib/types'
import { useWorkspaceStore } from '@/stores/workspace'

function useRepoScope() {
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const connected = useWorkspaceStore((s) => s.connected)
  return { repoPath, connected }
}

export function useRepoStatus(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitRepoStatus>({
    queryKey: ['repo', repoPath, 'status'],
    queryFn: async () => (await window.gitfredo.invoke('repo.status')) as GitRepoStatus,
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useLogGraph(enabled = true, maxCount = 500) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitLogGraphResult>({
    queryKey: ['repo', repoPath, 'log.graph', maxCount],
    queryFn: async () =>
      (await window.gitfredo.invoke('log.graph', { maxCount })) as GitLogGraphResult,
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useBranches(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitBranch[]>({
    queryKey: ['repo', repoPath, 'branch.list'],
    queryFn: async () => (await window.gitfredo.invoke('branch.list')) as GitBranch[],
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useRemotes(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitRemote[]>({
    queryKey: ['repo', repoPath, 'remote.list'],
    queryFn: async () => (await window.gitfredo.invoke('remote.list')) as GitRemote[],
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useWorkingStatus(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitWorkingStatus>({
    queryKey: ['repo', repoPath, 'working.status'],
    queryFn: async () =>
      (await window.gitfredo.invoke('working.status')) as GitWorkingStatus,
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useStashList(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitStashEntry[]>({
    queryKey: ['repo', repoPath, 'stash.list'],
    queryFn: async () => (await window.gitfredo.invoke('stash.list')) as GitStashEntry[],
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useMergeStatus(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitMergeStatus>({
    queryKey: ['repo', repoPath, 'merge.status'],
    queryFn: async () => (await window.gitfredo.invoke('merge.status')) as GitMergeStatus,
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useDiffWorking(path?: string, enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery({
    queryKey: ['repo', repoPath, 'diff.working', path],
    queryFn: async () => window.gitfredo.invoke('diff.working', { path }),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useDiffStaged(path?: string, enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery({
    queryKey: ['repo', repoPath, 'diff.staged', path],
    queryFn: async () => window.gitfredo.invoke('diff.staged', { path }),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useDiffCommits(
  fromRef: string | null,
  toRef: string | null,
  path?: string,
  enabled = true
) {
  const { repoPath, connected } = useRepoScope()
  return useQuery({
    queryKey: ['repo', repoPath, 'diff.commits', fromRef, toRef, path],
    queryFn: async () =>
      window.gitfredo.invoke('diff.commits', { fromRef, toRef, path }),
    enabled: enabled && connected && Boolean(repoPath) && Boolean(fromRef && toRef)
  })
}

export function useDiffShow(ref: string | null, path?: string, enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitDiffResult>({
    queryKey: ['repo', repoPath, 'diff.show', ref, path],
    queryFn: async () =>
      (await window.gitfredo.invoke('diff.show', { ref, path })) as GitDiffResult,
    enabled: enabled && connected && Boolean(repoPath) && Boolean(ref)
  })
}
