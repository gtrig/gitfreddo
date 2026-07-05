import type { SubmoduleEntryStatus } from '@shared/submodule'

export function submoduleStatusLabel(status: SubmoduleEntryStatus): string {
  switch (status) {
    case 'initialized':
      return 'S'
    case 'uninitialized':
      return 'S?'
    case 'dirty':
      return 'S~'
    case 'ahead':
      return 'S+'
    case 'behind':
      return 'S-'
    default:
      return 'S'
  }
}

export function submoduleStatusColor(status: SubmoduleEntryStatus): string {
  switch (status) {
    case 'initialized':
      return 'text-sky-400'
    case 'uninitialized':
      return 'text-gf-fg-subtle'
    case 'dirty':
      return 'text-orange-400'
    case 'ahead':
      return 'text-amber-400'
    case 'behind':
      return 'text-violet-400'
    default:
      return 'text-gf-fg-muted'
  }
}

export function submoduleRowLabel(path: string, branch?: string): string {
  if (branch) return `${path} (${branch})`
  return path
}
