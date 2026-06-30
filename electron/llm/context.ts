import type { RepoManager } from '../git/repo-manager'
import type { AiFillParams } from '../../shared/ai'
import type { GitDiffResult, GitWorkingStatus } from '../git/types'

const DIFF_PURPOSES = new Set<AiFillParams['purpose']>(['commit_message', 'stash_message'])
const MAX_DIFF_CHARS = 8000

function truncateDiff(text: string): string {
  if (text.length <= MAX_DIFF_CHARS) {
    return text
  }
  return `${text.slice(0, MAX_DIFF_CHARS)}\n… (diff truncated)`
}

export async function enrichAiContext(
  manager: RepoManager,
  params: AiFillParams
): Promise<AiFillParams> {
  if (!DIFF_PURPOSES.has(params.purpose) || params.context?.diffText) {
    return params
  }

  const repoPath = manager.getRepoPath()
  if (!repoPath) {
    return params
  }

  try {
    const status = (await manager.invoke(repoPath, 'working.status')) as GitWorkingStatus
    let filePaths = params.context?.filePaths
    let diffText: string | undefined

    if (params.purpose === 'commit_message') {
      filePaths = filePaths ?? status.staged.map((f) => f.path)
      if (filePaths.length > 0) {
        const diff = (await manager.invoke(repoPath, 'diff.staged')) as GitDiffResult
        diffText = diff.unified?.trim() || undefined
      }
    } else if (params.purpose === 'stash_message') {
      const changed = [...status.unstaged, ...status.untracked, ...status.conflicted]
      filePaths = filePaths ?? changed.map((f) => f.path)
      if (filePaths.length > 0) {
        const diff = (await manager.invoke(repoPath, 'diff.working')) as GitDiffResult
        diffText = diff.unified?.trim() || undefined
      }
    }

    let branch = params.context?.branch
    if (!branch) {
      try {
        const repoStatus = (await manager.invoke(repoPath, 'repo.status')) as { branch: string }
        branch = repoStatus.branch
      } catch {
        branch = status.branch
      }
    }

    if (!diffText && (!filePaths || filePaths.length === 0)) {
      return params
    }

    return {
      ...params,
      context: {
        ...params.context,
        branch,
        filePaths,
        diffText: diffText ? truncateDiff(diffText) : undefined
      }
    }
  } catch {
    return params
  }
}
