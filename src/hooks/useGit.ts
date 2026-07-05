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
    queryFn: async () => (await window.gitfreddo.invoke('repo.status')) as GitRepoStatus,
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useLogGraph(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  const maxCount = useLogMaxCount()
  return useQuery<GitLogGraphResult>({
    queryKey: ['repo', repoPath, 'log.graph', maxCount],
    queryFn: async () =>
      (await window.gitfreddo.invoke('log.graph', { maxCount })) as GitLogGraphResult,
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useBranches(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitBranch[]>({
    queryKey: ['repo', repoPath, 'branch.list'],
    queryFn: async () => (await window.gitfreddo.invoke('branch.list')) as GitBranch[],
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useRemotes(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitRemote[]>({
    queryKey: ['repo', repoPath, 'remote.list'],
    queryFn: async () => (await window.gitfreddo.invoke('remote.list')) as GitRemote[],
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useTags(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitTag[]>({
    queryKey: ['repo', repoPath, 'tag.list'],
    queryFn: async () => (await window.gitfreddo.invoke('tag.list')) as GitTag[],
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useWorkingStatus(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitWorkingStatus>({
    queryKey: ['repo', repoPath, 'working.status'],
    queryFn: async () =>
      (await window.gitfreddo.invoke('working.status')) as GitWorkingStatus,
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useStashList(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitStashEntry[]>({
    queryKey: ['repo', repoPath, 'stash.list'],
    queryFn: async () => (await window.gitfreddo.invoke('stash.list')) as GitStashEntry[],
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useWorktreeList(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitWorktreeEntry[]>({
    queryKey: ['repo', repoPath, 'worktree.list'],
    queryFn: async () =>
      (await window.gitfreddo.invoke('worktree.list')) as GitWorktreeEntry[],
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useSubmoduleList(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitSubmoduleEntry[]>({
    queryKey: ['repo', repoPath, 'submodule.list'],
    queryFn: async () =>
      (await window.gitfreddo.invoke('submodule.list')) as GitSubmoduleEntry[],
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useMergeStatus(enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitMergeStatus>({
    queryKey: ['repo', repoPath, 'merge.status'],
    queryFn: async () => (await window.gitfreddo.invoke('merge.status')) as GitMergeStatus,
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useCleanPreview(includeIgnored: boolean, enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<string[]>({
    queryKey: ['repo', repoPath, 'working.cleanPreview', includeIgnored],
    queryFn: async () =>
      (await window.gitfreddo.invoke('working.cleanPreview', { includeIgnored })) as string[],
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useStashFiles(index: number | null, enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery({
    queryKey: ['repo', repoPath, 'stash.files', index],
    queryFn: async () => window.gitfreddo.invoke('stash.files', { index }) as Promise<string>,
    enabled: enabled && connected && Boolean(repoPath) && index !== null
  })
}

export function useStashDiff(index: number | null, path?: string, enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitDiffResult>({
    queryKey: ['repo', repoPath, 'stash.show', index, path],
    queryFn: async () =>
      (await window.gitfreddo.invoke('stash.show', { index, path })) as GitDiffResult,
    enabled: enabled && connected && Boolean(repoPath) && index !== null
  })
}

export function useDiffWorking(path?: string, enabled = true, wordDiff = false) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitDiffResult>({
    queryKey: ['repo', repoPath, 'diff.working', path, wordDiff],
    queryFn: async () =>
      (await window.gitfreddo.invoke('diff.working', { path, wordDiff })) as GitDiffResult,
    enabled: enabled && connected && Boolean(repoPath)
  })
}

export function useDiffStaged(path?: string, enabled = true, wordDiff = false) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitDiffResult>({
    queryKey: ['repo', repoPath, 'diff.staged', path, wordDiff],
    queryFn: async () =>
      (await window.gitfreddo.invoke('diff.staged', { path, wordDiff })) as GitDiffResult,
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
      window.gitfreddo.invoke('diff.commits', { fromRef, toRef, path }),
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
    queryFn: async () =>
      (await window.gitfreddo.invoke('diff.commitRange', {
        oldestHash,
        newestHash
      })) as GitDiffResult,
    enabled: enabled && connected && Boolean(repoPath) && Boolean(oldestHash && newestHash)
  })
}

export function useDiffShow(ref: string | null, path?: string, enabled = true) {
  const { repoPath, connected } = useRepoScope()
  return useQuery<GitDiffResult>({
    queryKey: ['repo', repoPath, 'diff.show', ref, path],
    queryFn: async () =>
      (await window.gitfreddo.invoke('diff.show', { ref, path })) as GitDiffResult,
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
      const [base, sideA, sideB, working] = await Promise.all([
        window.gitfreddo.invoke('file.readStage', { stage: 1, path: filePath }) as Promise<string>,
        window.gitfreddo.invoke('file.readStage', { stage: 2, path: filePath }) as Promise<string>,
        window.gitfreddo.invoke('file.readStage', { stage: 3, path: filePath }) as Promise<string>,
        window.gitfreddo.invoke('working.read', { path: filePath }).then(
          (result) => (result as { content: string }).content
        ) as Promise<string>
      ])
      return { base, sideA, sideB, working }
    },
    enabled: enabled && connected && Boolean(repoPath) && Boolean(path)
  })
}
