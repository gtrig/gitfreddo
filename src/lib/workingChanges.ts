import type { FileChangeStatus, GitFileChange, GitWorkingStatus } from './types'

export interface WorkingChangeCounts {
  added: number
  modified: number
  deleted: number
}

const STATUS_PRIORITY: Record<FileChangeStatus, number> = {
  conflicted: 6,
  deleted: 5,
  modified: 4,
  renamed: 4,
  added: 3,
  copied: 3,
  untracked: 2
}

function dominantStatus(current: FileChangeStatus | undefined, next: FileChangeStatus): FileChangeStatus {
  if (!current) return next
  return STATUS_PRIORITY[next] >= STATUS_PRIORITY[current] ? next : current
}

function bucketStatus(status: FileChangeStatus): keyof WorkingChangeCounts | null {
  switch (status) {
    case 'added':
    case 'untracked':
    case 'copied':
      return 'added'
    case 'modified':
    case 'renamed':
    case 'conflicted':
      return 'modified'
    case 'deleted':
      return 'deleted'
    default:
      return null
  }
}

/** Count unique paths in the working tree by added / modified / deleted. */
export function countWorkingChanges(status: GitWorkingStatus): WorkingChangeCounts {
  const statusByPath = new Map<string, FileChangeStatus>()
  const files: GitFileChange[] = [
    ...status.conflicted,
    ...status.staged,
    ...status.unstaged,
    ...status.untracked
  ]

  for (const file of files) {
    statusByPath.set(file.path, dominantStatus(statusByPath.get(file.path), file.status))
  }

  const counts: WorkingChangeCounts = { added: 0, modified: 0, deleted: 0 }
  for (const fileStatus of statusByPath.values()) {
    const bucket = bucketStatus(fileStatus)
    if (bucket) counts[bucket] += 1
  }

  return counts
}
