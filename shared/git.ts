/** @deprecated Import from `@shared/git/ipc/params` */
export type { BranchCheckoutParams } from './git/ipc/params'

export function repoNameFromUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '')
  let name = trimmed.split('/').pop() ?? 'repository'
  if (name.includes(':')) {
    name = name.split(':').pop() ?? name
  }
  return name.replace(/\.git$/i, '') || 'repository'
}
