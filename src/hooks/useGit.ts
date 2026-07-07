import { useQuery } from '@tanstack/react-query'
import type {
  GitBranch,
  GitDiffResult,
  GitLogGraphResult,
  GitMergeStatus,
  GitRemote,
  GitRepoStatus,
  GitStashEntry,
  GitSubmoduleEntry,
  GitTag,
  GitWorktreeEntry,
  GitWorkingStatus
} from '@/lib/types'
import { useWorkspaceStore } from '@/stores/workspace'
import { useLogMaxCount } from '@/hooks/useAppSettings'

function useRepoScope() {
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const connected = useWorkspaceStore((s) => s.connected)
  return { repoPath, connected }
}

export function useRepoStatus(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitRepoStatus>({
    queryKey: ['repo', repoPath, 'status'],
    queryFn: () => window.gitfreddo.invoke('repo.status'),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useLogGraph(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  const maxCount = useLogMaxCount()
  return useQuery<GitLogGraphResult>({
    queryKey: ['repo', repoPath, 'log.graph', maxCount],
    queryFn: () => window.gitfreddo.invoke('log.graph', { maxCount }),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useBranches(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitBranch[]>({
    queryKey: ['repo', repoPath, 'branch.list'],
    queryFn: () => window.gitfreddo.invoke('branch.list'),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useRemotes(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitRemote[]>({
    queryKey: ['repo', repoPath, 'remote.list'],
    queryFn: () => window.gitfreddo.invoke('remote.list'),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useTags(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitTag[]>({
    queryKey: ['repo', repoPath, 'tag.list'],
    queryFn: () => window.gitfreddo.invoke('tag.list'),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useWorkingStatus(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitWorkingStatus>({
    queryKey: ['repo', repoPath, 'working.status'],
    queryFn: () => window.gitfreddo.invoke('working.status'),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useStashList(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitStashEntry[]>({
    queryKey: ['repo', repoPath, 'stash.list'],
    queryFn: () => window.gitfreddo.invoke('stash.list'),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useWorktreeList(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitWorktreeEntry[]>({
    queryKey: ['repo', repoPath, 'worktree.list'],
    queryFn: () => window.gitfreddo.invoke('worktree.list'),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useSubmoduleList(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitSubmoduleEntry[]>({
    queryKey: ['repo', repoPath, 'submodule.list'],
    queryFn: () => window.gitfreddo.invoke('submodule.list'),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useMergeStatus(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitMergeStatus>({
    queryKey: ['repo', repoPath, 'merge.status'],
    queryFn: () => window.gitfreddo.invoke('merge.status'),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useCleanPreview(includeIgnored: boolean, enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<string[]>({
    queryKey: ['repo', repoPath, 'working.cleanPreview', includeIgnored],
    queryFn: () => window.gitfreddo.invoke('working.cleanPreview', { includeIgnored }),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useStashFiles(index: number | null, enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery({
    queryKey: ['repo', repoPath, 'stash.files', index],
    queryFn: () => window.gitfreddo.invoke('stash.files', { index: index! }),
    enabled: enabled && connected && Boolean(repoPath) && index !== null
  })
}

export function useStashDiff(index: number | null, path?: string, enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitDiffResult>({
    queryKey: ['repo', repoPath, 'stash.show', index, path],
    queryFn: () => window.gitfreddo.invoke('stash.show', { index: index!, path }),
    enabled: enabled && connected && Boolean(repoPath) && index !== null
  })
}

export function useDiffWorking(path?: string, enabled = true, wordDiff = false) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitDiffResult>({
    queryKey: ['repo', repoPath, 'diff.working', path, wordDiff],
    queryFn: () => window.gitfreddo.invoke('diff.working', { path, wordDiff }),
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useDiffStaged(path?: string, enabled = true, wordDiff = false) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitDiffResult>({
    queryKey: ['repo', repoPath, 'diff.staged', path, wordDiff],
    queryFn: () => window.gitfreddo.invoke('diff.staged', { path, wordDiff }),
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
  return useQuery<GitDiffResult>({
    queryKey: ['repo', repoPath, 'diff.commits', fromRef, toRef, path],
    queryFn: () =>
      window.gitfreddo.invoke('diff.commits', {
        fromRef: fromRef!,
        toRef: toRef!,
        path
      }),
    enabled: enabled && connected && Boolean(repoPath) && Boolean(fromRef && toRef)
  })
}

export function useDiffCommitRange(
  oldestHash: string | null,
  newestHash: string | null,
  enabled = true
) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitDiffResult>({
    queryKey: ['repo', repoPath, 'diff.commitRange', oldestHash, newestHash],
    queryFn: () =>
      window.gitfreddo.invoke('diff.commitRange', {
        oldestHash: oldestHash!,
        newestHash: newestHash!
      }),
    enabled: enabled && connected && Boolean(repoPath) && Boolean(oldestHash && newestHash)
  })
}

export function useDiffShow(ref: string | null, path?: string, enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitDiffResult>({
    queryKey: ['repo', repoPath, 'diff.show', ref, path],
    queryFn: () => window.gitfreddo.invoke('diff.show', { ref: ref!, path }),
    enabled: enabled && connected && Boolean(repoPath) && Boolean(ref)
  })
}

export interface ConflictFileStages {
  base: string
  sideA: string
  sideB: string
  working: string
}

export function useConflictFileStages(path: string | undefined, enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<ConflictFileStages>({
    queryKey: ['repo', repoPath, 'conflict.stages', path],
    queryFn: async () => {
      const filePath = path!
      const [base, sideA, sideB, workingRead] = await Promise.all([
        window.gitfreddo.invoke('file.readStage', { stage: 1, path: filePath }),
        window.gitfreddo.invoke('file.readStage', { stage: 2, path: filePath }),
        window.gitfreddo.invoke('file.readStage', { stage: 3, path: filePath }),
        window.gitfreddo.invoke('working.read', { path: filePath })
      ])
      return { base, sideA, sideB, working: workingRead.content }
    },
    enabled: enabled && connected && Boolean(repoPath) && Boolean(path)
  })
}
