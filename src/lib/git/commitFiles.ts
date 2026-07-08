import type { CommitFileChangeKind, CommitFileItem } from '@/lib/types'

/** Parse `git show --name-status` output into structured file rows. */
export function parseCommitNameStatus(output: string): CommitFileItem[] {
  const items: CommitFileItem[] = []

  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const parts = trimmed.split('\t')
    const status = parts[0] ?? ''
    if (!status) continue

    if (status[0] === 'R' || status[0] === 'C') {
      const path = parts[2] ?? parts[1]
      if (!path) continue
      items.push({
        path,
        kind: status[0] === 'R' ? 'changed' : 'added'
      })
      continue
    }

    const path = parts[1]
    if (!path) continue

    switch (status[0]) {
      case 'A':
        items.push({ path, kind: 'added' })
        break
      case 'M':
      case 'T':
        items.push({ path, kind: 'changed' })
        break
      case 'D':
        items.push({ path, kind: 'removed' })
        break
      default:
        items.push({ path, kind: 'changed' })
        break
    }
  }

  return items
}

export function commitFileKindLabel(kind: CommitFileChangeKind): string {
  switch (kind) {
    case 'added':
      return 'A'
    case 'changed':
      return 'M'
    case 'removed':
      return 'D'
    case 'unchanged':
      return ' '
    default:
      return '?'
  }
}

/** Parse `git ls-tree -r --name-only` output into repo paths. */
export function parseCommitTreePaths(output: string): string[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** Union commit name-status rows with full tree paths; tree-only paths are unchanged. */
export function mergeCommitFilesWithTree(
  changedFiles: CommitFileItem[],
  allPaths: string[]
): CommitFileItem[] {
  const changedByPath = new Map(changedFiles.map((file) => [file.path, file]))
  const treePaths = new Set(allPaths)
  const merged: CommitFileItem[] = allPaths.map(
    (path) => changedByPath.get(path) ?? { path, kind: 'unchanged' }
  )

  for (const file of changedFiles) {
    if (!treePaths.has(file.path)) {
      merged.push(file)
    }
  }

  return merged
}

export function commitFileKindColor(kind: CommitFileChangeKind): string {
  switch (kind) {
    case 'added':
      return 'text-emerald-400'
    case 'changed':
      return 'text-amber-400'
    case 'removed':
      return 'text-rose-400'
    case 'unchanged':
      return 'text-gf-fg-subtle'
    default:
      return 'text-gf-fg-muted'
  }
}
