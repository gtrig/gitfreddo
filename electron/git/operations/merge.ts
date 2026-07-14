import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { buildSquashMergeIntoMessage } from '../../../src/lib/git/squashMergeInto'
import {
  buildBranchShowCurrentArgs,
  buildDiffConflictNamesArgs,
  buildMergeAbortArgs,
  buildMergeContinueArgs,
  mergeStart as mergeStartCommand,
  buildRevParseShortArgs
} from '../../../shared/git/commands'
import { runCommand, runGitOrThrow } from '../git-runner'
import { gitMetadataPath, readGitMetadataFile, rebaseInProgress, resolveGitDir } from '../git-dir'
import { branchCheckout } from './branch'
import { continueGitOperation } from './commit-message'
import { commitCreate, workingStatus } from './status'
import type { GitMergeStartResult, GitMergeStatus, GitSquashMergeIntoResult } from '../types'

async function shortHash(cwd: string, gitBinaryPath: string, ref: string): Promise<string> {
  try {
    return (await runGitOrThrow(buildRevParseShortArgs(ref), { cwd, gitBinaryPath })).trim()
  } catch {
    return ref.slice(0, 7)
  }
}

function parseMergeIncomingLabel(mergeMsg: string | undefined): string | undefined {
  if (!mergeMsg) return undefined
  const firstLine = mergeMsg.split('\n')[0]?.trim() ?? ''
  const branchMatch = firstLine.match(/Merge branch '([^']+)'/)
  if (branchMatch?.[1]) return branchMatch[1]
  const remoteMatch = firstLine.match(/Merge remote-tracking branch '([^']+)'/)
  if (remoteMatch?.[1]) return remoteMatch[1]
  return firstLine || undefined
}

async function readRebaseStepCommit(
  cwd: string,
  gitBinaryPath: string
): Promise<string | undefined> {
  try {
    const gitDir = await resolveGitDir(cwd, gitBinaryPath)
    const ontoPath = join(gitDir, 'rebase-merge', 'onto')
    const headNamePath = join(gitDir, 'rebase-merge', 'head-name')
    if (existsSync(headNamePath)) {
      const headName = readFileSync(headNamePath, 'utf8').trim()
      if (headName.startsWith('refs/heads/')) {
        return headName.slice('refs/heads/'.length)
      }
      return headName
    }
    if (existsSync(ontoPath)) {
      const onto = readFileSync(ontoPath, 'utf8').trim()
      return shortHash(cwd, gitBinaryPath, onto)
    }
  } catch {
    // ignore
  }
  return undefined
}

export async function mergeStatus(cwd: string, gitBinaryPath: string): Promise<GitMergeStatus> {
  const mergeActive = Boolean(await readGitMetadataFile(cwd, gitBinaryPath, 'MERGE_HEAD'))
  const rebaseActive = await rebaseInProgress(cwd, gitBinaryPath)
  const cherryPickActive = Boolean(
    await readGitMetadataFile(cwd, gitBinaryPath, 'CHERRY_PICK_HEAD')
  )
  const inProgress = mergeActive || rebaseActive || cherryPickActive

  let conflictedPaths: string[] = []
  if (inProgress) {
    const stdout = await runGitOrThrow(buildDiffConflictNamesArgs(), {
      cwd,
      gitBinaryPath
    })
    conflictedPaths = stdout.split('\n').filter(Boolean)
  }

  const kind = mergeActive
    ? 'merge'
    : rebaseActive
      ? 'rebase'
      : cherryPickActive
        ? 'cherry-pick'
        : null

  const mergeHead = await readGitMetadataFile(cwd, gitBinaryPath, 'MERGE_HEAD')
  const origHead = await readGitMetadataFile(cwd, gitBinaryPath, 'ORIG_HEAD')
  const cherryPickHead = await readGitMetadataFile(cwd, gitBinaryPath, 'CHERRY_PICK_HEAD')

  let currentBranch: string | undefined
  try {
    currentBranch = (
      await runGitOrThrow(buildBranchShowCurrentArgs(), { cwd, gitBinaryPath })
    ).trim()
    if (!currentBranch) currentBranch = undefined
  } catch {
    currentBranch = undefined
  }

  let incomingLabel: string | undefined
  let mergeMessage: string | undefined
  if (mergeActive) {
    const mergeMsgPath = await gitMetadataPath(cwd, gitBinaryPath, 'MERGE_MSG')
    let mergeMsg: string | undefined
    try {
      mergeMsg = readFileSync(mergeMsgPath, 'utf8')
    } catch {
      mergeMsg = undefined
    }
    mergeMessage = mergeMsg?.trim() || undefined
    incomingLabel = parseMergeIncomingLabel(mergeMsg)
    if (!incomingLabel && mergeHead) {
      incomingLabel = await shortHash(cwd, gitBinaryPath, mergeHead)
    }
  } else if (rebaseActive) {
    incomingLabel = (await readRebaseStepCommit(cwd, gitBinaryPath)) ?? 'rebase step'
  } else if (cherryPickActive && cherryPickHead) {
    incomingLabel = await shortHash(cwd, gitBinaryPath, cherryPickHead)
  }

  const theirsRef = mergeActive ? mergeHead : cherryPickActive ? cherryPickHead : origHead
  const oursCommit = origHead ? await shortHash(cwd, gitBinaryPath, origHead) : undefined
  const theirsCommit = theirsRef ? await shortHash(cwd, gitBinaryPath, theirsRef) : undefined

  return {
    inProgress,
    kind,
    conflictedPaths,
    ours: mergeHead,
    theirs: origHead,
    currentBranch,
    incomingLabel,
    mergeMessage,
    oursCommit,
    theirsCommit
  }
}

export async function mergeStart(
  cwd: string,
  gitBinaryPath: string,
  branch: string,
  options: { noFf?: boolean; squash?: boolean } = {}
): Promise<GitMergeStartResult> {
  const result = await runCommand(
    mergeStartCommand,
    { branch, ...options },
    { cwd, gitBinaryPath }
  )
  if (result.code === 0) {
    return { status: 'completed', conflictedPaths: [] }
  }

  const status = await workingStatus(cwd, gitBinaryPath)
  const mergeActive = Boolean(await readGitMetadataFile(cwd, gitBinaryPath, 'MERGE_HEAD'))
  const conflictedPaths = status.conflicted.map((file) => file.path)

  if (mergeActive || conflictedPaths.length > 0) {
    return { status: 'conflicts', conflictedPaths }
  }

  const detail = formatMergeFailureMessage(result.stderr, result.stdout, result.code)
  throw new Error(detail)
}

export async function mergeInto(
  cwd: string,
  gitBinaryPath: string,
  params: { sourceBranch: string; targetBranch: string; noFf?: boolean; squash?: boolean }
): Promise<GitMergeStartResult> {
  const sourceBranch = params.sourceBranch.trim()
  const targetBranch = params.targetBranch.trim()
  if (!sourceBranch || !targetBranch) {
    throw new Error('Source and target branch are required.')
  }
  if (sourceBranch === targetBranch) {
    throw new Error('Source and target branch must differ.')
  }

  const status = await workingStatus(cwd, gitBinaryPath)
  if (status.branch !== targetBranch) {
    await branchCheckout(cwd, gitBinaryPath, targetBranch)
  }

  return mergeStart(cwd, gitBinaryPath, sourceBranch, {
    noFf: params.noFf,
    squash: params.squash
  })
}

export async function mergeSquashInto(
  cwd: string,
  gitBinaryPath: string,
  params: { sourceBranch: string; targetBranch: string; message?: string }
): Promise<GitSquashMergeIntoResult> {
  const sourceBranch = params.sourceBranch.trim()
  const targetBranch = params.targetBranch.trim()
  if (!sourceBranch || !targetBranch) {
    throw new Error('Source and target branch are required.')
  }
  if (sourceBranch === targetBranch) {
    throw new Error('Source and target branch must differ.')
  }

  const status = await workingStatus(cwd, gitBinaryPath)
  if (
    status.staged.length > 0 ||
    status.unstaged.length > 0 ||
    status.untracked.length > 0 ||
    status.conflicted.length > 0
  ) {
    throw new Error('Working tree must be clean before squash merging into another branch.')
  }
  if (status.branch !== sourceBranch) {
    throw new Error(`Checkout ${sourceBranch} before squash merging into another branch.`)
  }

  await branchCheckout(cwd, gitBinaryPath, targetBranch)

  const result = await runCommand(
    mergeStartCommand,
    { branch: sourceBranch, squash: true },
    { cwd, gitBinaryPath }
  )
  if (result.code !== 0) {
    const workStatus = await workingStatus(cwd, gitBinaryPath)
    const conflictedPaths = workStatus.conflicted.map((file) => file.path)
    if (conflictedPaths.length > 0) {
      return { status: 'conflicts', conflictedPaths, targetBranch }
    }
    throw new Error(formatMergeFailureMessage(result.stderr, result.stdout, result.code))
  }

  const commitMessage = params.message?.trim() || buildSquashMergeIntoMessage(sourceBranch)
  const commitHash = await commitCreate(cwd, gitBinaryPath, commitMessage)
  return { status: 'completed', conflictedPaths: [], commitHash, targetBranch }
}

export function parseConflictPathsFromMergeOutput(text: string): string[] {
  const paths = new Set<string>()
  const conflictLine = /CONFLICT[^:]*:\s*Merge conflict in (.+)/gi
  let match: RegExpExecArray | null
  while ((match = conflictLine.exec(text)) !== null) {
    const path = match[1]?.trim()
    if (path) paths.add(path)
  }
  return [...paths]
}

export function formatMergeFailureMessage(stderr: string, stdout: string, code: number): string {
  const text = `${stderr}\n${stdout}`.trim()
  const conflicts = parseConflictPathsFromMergeOutput(text)
  if (conflicts.length > 0) {
    const list = conflicts.join(', ')
    return `Merge stopped due to conflicts in: ${list}`
  }

  const firstLine =
    text
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith('Auto-merging')) ?? ''

  if (firstLine) return firstLine
  return `git merge failed (exit ${code})`
}

export async function mergeAbort(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(buildMergeAbortArgs(), { cwd, gitBinaryPath })
}

export async function mergeContinue(
  cwd: string,
  gitBinaryPath: string,
  message?: string
): Promise<void> {
  await continueGitOperation(cwd, gitBinaryPath, buildMergeContinueArgs(), message)
}
