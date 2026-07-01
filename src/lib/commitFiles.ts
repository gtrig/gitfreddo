import type { CommitFileChangeKind, CommitFileItem } from './types'

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
