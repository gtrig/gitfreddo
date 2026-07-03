/** Suggest a sibling directory for a new worktree checkout. */
export function suggestWorktreePath(repoRoot: string, branchName: string): string {
  const normalized = repoRoot.replace(/[/\\]+$/, '')
  const sep = normalized.includes('\\') ? '\\' : '/'
  const parts = normalized.split(/[/\\]/)
  const parent = parts.length > 1 ? parts.slice(0, -1).join(sep) : normalized
  const safeBranch = branchName.replace(/[/\\:]/g, '-')
  return `${parent}${sep}${safeBranch}`
}

export function worktreeLabel(entry: { branch?: string; isDetached: boolean; path: string }): string {
  if (entry.branch) return entry.branch
  if (entry.isDetached) return '(detached)'
  const parts = entry.path.replace(/[/\\]+$/, '').split(/[/\\]/)
  return parts[parts.length - 1] || entry.path
}
