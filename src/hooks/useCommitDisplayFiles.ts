import { useMemo } from 'react'
import { mergeCommitFilesWithTree } from '@/lib/git/commitFiles'
import { useCommitChangedFiles, useCommitTreeFiles } from '@/hooks/useGit'

export function useCommitDisplayFiles(hash: string | null, showAllFiles: boolean, enabled = true) {
  const changedQuery = useCommitChangedFiles(hash, enabled)
  const treeQuery = useCommitTreeFiles(hash, enabled && showAllFiles)

  const files = useMemo(() => {
    const changed = changedQuery.data ?? []
    if (!showAllFiles) return changed
    if (!treeQuery.data) return changed
    return mergeCommitFilesWithTree(changed, treeQuery.data)
  }, [changedQuery.data, showAllFiles, treeQuery.data])

  return {
    files,
    loading: changedQuery.isLoading || (showAllFiles && treeQuery.isLoading),
    loadingAllFiles: treeQuery.isLoading,
    error: (changedQuery.error ?? treeQuery.error) as Error | null
  }
}
