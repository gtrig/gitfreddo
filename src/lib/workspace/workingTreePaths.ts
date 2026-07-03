import type { GitFileChange } from '@/lib/types'

/** Paths with local modifications that can be discarded (not untracked or conflicted). */
export function discardablePaths(files: GitFileChange[]): string[] {
  return files
    .filter((file) => file.status !== 'untracked' && file.status !== 'conflicted')
    .map((file) => file.path)
}

export function pathsUnderFolderPrefix(files: GitFileChange[], folderPath: string): string[] {
  const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`
  return files
    .filter((file) => file.path === folderPath || file.path.startsWith(prefix))
    .map((file) => file.path)
}
