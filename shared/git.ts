/** Params for `branch.checkout` IPC — maps to `git switch [--detach] <ref>`. */
export interface BranchCheckoutParams {
  name: string
  /** Detach HEAD at a commit or tag. Omitted for local branch checkout. */
  detach?: boolean
}

export function repoNameFromUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '')
  let name = trimmed.split('/').pop() ?? 'repository'
  if (name.includes(':')) {
    name = name.split(':').pop() ?? name
  }
  return name.replace(/\.git$/i, '') || 'repository'
}
