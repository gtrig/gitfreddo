import type { RepoManager } from '../git/repo-manager'
import type { AiFillContext, AiFillParams } from '../../shared/ai'
import type { GitDiffResult, GitWorkingStatus } from '../git/types'

const DIFF_PURPOSES = new Set<AiFillParams['purpose']>([
  'commit_message',
  'stash_message',
  'compose_commits',
  'analyze_changes'
])
const MAX_DIFF_CHARS = 8000
const MAX_STAGE_CHARS = 12000

function truncateText(text: string, max: number): string {
  if (text.length <= max) {
    return text
  }
  return `${text.slice(0, max)}\n… (truncated)`
}

function truncateDiff(text: string): string {
  return truncateText(text, MAX_DIFF_CHARS)
}

type ConflictStageContext = Pick<AiFillContext, 'sideA' | 'sideB' | 'sideBase' | 'conflictContent'>

async function loadConflictStages(
  manager: RepoManager,
  repoPath: string,
  filePath: string
): Promise<ConflictStageContext> {
  const [sideBase, sideA, sideB, conflictContent] = await Promise.all([
    manager.invoke(repoPath, 'file.readStage', { stage: 1, path: filePath }) as Promise<string>,
    manager.invoke(repoPath, 'file.readStage', { stage: 2, path: filePath }) as Promise<string>,
    manager.invoke(repoPath, 'file.readStage', { stage: 3, path: filePath }) as Promise<string>,
    manager.invoke(repoPath, 'working.read', { path: filePath }).then(
      (result) => (result as { content: string }).content
    ) as Promise<string>
  ])
  return {
    sideBase: truncateText(sideBase, MAX_STAGE_CHARS),
    sideA: truncateText(sideA, MAX_STAGE_CHARS),
    sideB: truncateText(sideB, MAX_STAGE_CHARS),
    conflictContent: truncateText(conflictContent, MAX_STAGE_CHARS)
  }
}

export async function enrichAiContext(
  manager: RepoManager,
  params: AiFillParams
): Promise<AiFillParams> {
  const repoPath = manager.getRepoPath()
  if (!repoPath) {
    return params
  }

  if (params.purpose === 'resolve_conflict') {
    const filePath = params.context?.filePath?.trim()
    if (!filePath) {
      return params
    }

    try {
      const stages: ConflictStageContext =
        params.context?.conflictContent && params.context?.sideA && params.context?.sideB
          ? {
              sideBase: params.context.sideBase,
              sideA: params.context.sideA,
              sideB: params.context.sideB,
              conflictContent: params.context.conflictContent
            }
          : await loadConflictStages(manager, repoPath, filePath)

      let branch = params.context?.branch
      let operationKind = params.context?.operationKind
      let incomingLabel = params.context?.incomingLabel

      if (!branch || !operationKind) {
        try {
          const mergeStatus = (await manager.invoke(repoPath, 'merge.status')) as {
            kind?: 'merge' | 'rebase' | 'cherry-pick' | null
            currentBranch?: string
            incomingLabel?: string
          }
          branch = branch ?? mergeStatus.currentBranch
          operationKind = operationKind ?? mergeStatus.kind ?? undefined
          incomingLabel = incomingLabel ?? mergeStatus.incomingLabel
        } catch {
          // ignore
        }
      }

      return {
        ...params,
        context: {
          ...params.context,
          filePath,
          branch,
          operationKind,
          incomingLabel,
          ...stages
        }
      }
    } catch {
      return params
    }
  }

  if (!DIFF_PURPOSES.has(params.purpose) || params.context?.diffText) {
    return params
  }

  try {
    const status = (await manager.invoke(repoPath, 'working.status')) as GitWorkingStatus
    let filePaths = params.context?.filePaths
    let diffText: string | undefined

    if (params.purpose === 'commit_message' || params.purpose === 'compose_commits') {
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
    } else if (params.purpose === 'analyze_changes') {
      const unstaged = [...status.unstaged, ...status.untracked, ...status.conflicted]
      const stagedPaths = status.staged.map((f) => f.path)
      const unstagedPaths = unstaged.map((f) => f.path)
      filePaths = filePaths ?? [...stagedPaths, ...unstagedPaths]

      const diffParts: string[] = []
      if (stagedPaths.length > 0) {
        const stagedDiff = (await manager.invoke(repoPath, 'diff.staged')) as GitDiffResult
        const stagedText = stagedDiff.unified?.trim()
        if (stagedText) {
          diffParts.push(`--- Staged changes ---\n${stagedText}`)
        }
      }
      if (unstagedPaths.length > 0) {
        const workingDiff = (await manager.invoke(repoPath, 'diff.working')) as GitDiffResult
        const workingText = workingDiff.unified?.trim()
        if (workingText) {
          diffParts.push(`--- Unstaged changes ---\n${workingText}`)
        }
      }
      diffText = diffParts.length > 0 ? diffParts.join('\n\n') : undefined

      let analyzeBranch = params.context?.branch
      if (!analyzeBranch) {
        try {
          const repoStatus = (await manager.invoke(repoPath, 'repo.status')) as { branch: string }
          analyzeBranch = repoStatus.branch
        } catch {
          analyzeBranch = status.branch
        }
      }

      if (!diffText && filePaths.length === 0) {
        return params
      }

      return {
        ...params,
        context: {
          ...params.context,
          branch: analyzeBranch,
          filePaths,
          stagedFilePaths: stagedPaths,
          unstagedFilePaths: unstagedPaths,
          diffText: diffText ? truncateDiff(diffText) : undefined
        }
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
