import { useQuery } from '@tanstack/react-query'
import { useLogMaxCount } from '@/hooks/useAppSettings'
import { parseCommitNameStatus } from '@/lib/git/commitFiles'
import type { CommitFileItem } from '@/lib/types'
import { useRepoQuery, useRepoScope } from '@/hooks/useRepoQuery'

export { useRepoScope } from '@/hooks/useRepoQuery'

export function useRepoStatus(enabled = true) {
  return useRepoQuery({ method: 'repo.status', enabled })
}

export function useLogGraph(enabled = true) {
  const maxCount = useLogMaxCount()
  return useRepoQuery({
    method: 'log.graph',
    params: { maxCount },
    extraKey: [maxCount],
    enabled
  })
}

export function useCommitChangedFiles(hash: string | null, enabled = true) {
  return useRepoQuery({
    method: 'log.show',
    params: { hash: hash! },
    extraKey: [hash],
    enabled: enabled && Boolean(hash),
    select: (output) => parseCommitNameStatus(output as unknown as string) as CommitFileItem[]
  })
}

export function useCommitTreeFiles(hash: string | null, enabled = true) {
  return useRepoQuery({
    method: 'log.tree',
    params: { hash: hash! },
    extraKey: [hash],
    enabled: enabled && Boolean(hash)
  })
}

export function useBranches(enabled = true) {
  return useRepoQuery({ method: 'branch.list', enabled })
}

export function useRemotes(enabled = true) {
  return useRepoQuery({ method: 'remote.list', enabled })
}

export function useTags(enabled = true) {
  return useRepoQuery({ method: 'tag.list', enabled })
}

export function useWorkingStatus(enabled = true) {
  return useRepoQuery({ method: 'working.status', enabled })
}

export function useStashList(enabled = true) {
  return useRepoQuery({ method: 'stash.list', enabled })
}

export function useWorktreeList(enabled = true) {
  return useRepoQuery({ method: 'worktree.list', enabled })
}

export function useSubmoduleList(enabled = true) {
  return useRepoQuery({ method: 'submodule.list', enabled })
}

export function useMergeStatus(enabled = true) {
  return useRepoQuery({ method: 'merge.status', enabled })
}

export function useCleanPreview(includeIgnored: boolean, enabled = true) {
  return useRepoQuery({
    method: 'working.cleanPreview',
    params: { includeIgnored },
    extraKey: [includeIgnored],
    enabled
  })
}

export function useStashFiles(index: number | null, enabled = true) {
  return useRepoQuery({
    method: 'stash.files',
    params: { index: index! },
    extraKey: [index],
    enabled: enabled && index !== null
  })
}

export function useStashDiff(index: number | null, path?: string, enabled = true) {
  return useRepoQuery({
    method: 'stash.show',
    params: { index: index!, path },
    extraKey: [index, path],
    enabled: enabled && index !== null
  })
}

export function useDiffWorking(path?: string, enabled = true, wordDiff = false) {
  return useRepoQuery({
    method: 'diff.working',
    params: { path, wordDiff },
    extraKey: [path, wordDiff],
    enabled
  })
}

export function useDiffStaged(path?: string, enabled = true, wordDiff = false) {
  return useRepoQuery({
    method: 'diff.staged',
    params: { path, wordDiff },
    extraKey: [path, wordDiff],
    enabled
  })
}

export function useDiffCommits(
  fromRef: string | null,
  toRef: string | null,
  path?: string,
  enabled = true,
  mergeBase = false
) {
  return useRepoQuery({
    method: 'diff.commits',
    params: {
      fromRef: fromRef!,
      toRef: toRef!,
      path,
      mergeBase
    },
    extraKey: [fromRef, toRef, path, mergeBase],
    enabled: enabled && Boolean(fromRef && toRef)
  })
}

export function useDiffCommitRange(
  oldestHash: string | null,
  newestHash: string | null,
  enabled = true
) {
  return useRepoQuery({
    method: 'diff.commitRange',
    params: {
      oldestHash: oldestHash!,
      newestHash: newestHash!
    },
    extraKey: [oldestHash, newestHash],
    enabled: enabled && Boolean(oldestHash && newestHash)
  })
}

export function useDiffShow(ref: string | null, path?: string, enabled = true) {
  return useRepoQuery({
    method: 'diff.show',
    params: { ref: ref!, path },
    extraKey: [ref, path],
    enabled: enabled && Boolean(ref)
  })
}

export function useFileRead(ref: string | null | undefined, path?: string, enabled = true) {
  return useRepoQuery({
    method: 'file.read',
    params: { ref: ref!, path: path! },
    extraKey: [ref, path],
    enabled: enabled && Boolean(ref) && Boolean(path)
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
