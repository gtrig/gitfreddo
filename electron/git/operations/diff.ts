import { resolveGitRef, runGit, runGitOrThrow } from '../git-runner'
import { isSubmodulePath } from './submodule'
import type { GitDiffResult } from '../types'
import {
  buildDiffCommitRangeArgs,
  buildDiffCommitsArgs,
  buildDiffNoIndexArgs,
  buildDiffStagedArgs,
  buildDiffWorkingArgs,
  buildLogShowArgs,
  buildLsFilesOthersArgs,
  buildRevParseParentArgs,
  buildShowBlobArgs
} from '../../../shared/git/commands'

async function isUntrackedPath(
  cwd: string,
  gitBinaryPath: string,
  path: string
): Promise<boolean> {
  const result = await runGit(buildLsFilesOthersArgs(path), {
    cwd,
    gitBinaryPath
  })
  if (result.code !== 0) {
    return false
  }
  return result.stdout.trim().length > 0
}

async function diffUntrackedPath(
  cwd: string,
  gitBinaryPath: string,
  path: string
): Promise<string> {
  const result = await runGit(buildDiffNoIndexArgs({ path }), {
    cwd,
    gitBinaryPath
  })
  // git diff --no-index exits 1 when files differ.
  if (result.code !== 0 && result.code !== 1) {
    throw new Error(result.stderr.trim() || `git diff exited with code ${result.code}`)
  }
  return result.stdout
}

export async function diffWorking(
  cwd: string,
  gitBinaryPath: string,
  path?: string,
  wordDiff = false
): Promise<GitDiffResult> {
  if (path && (await isSubmodulePath(cwd, gitBinaryPath, path))) {
    const args = buildDiffWorkingArgs({ path, wordDiff, submodule: true })
    const result = await runGit(args, { cwd, gitBinaryPath })
    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || `git diff exited with code ${result.code}`)
    }
    return { unified: result.stdout, path }
  }

  const args = buildDiffWorkingArgs({ path, wordDiff })
  const result = await runGit(args, { cwd, gitBinaryPath })
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || `git diff exited with code ${result.code}`)
  }

  let unified = result.stdout
  if (path && !unified.trim() && (await isUntrackedPath(cwd, gitBinaryPath, path))) {
    unified = await diffUntrackedPath(cwd, gitBinaryPath, path)
  }

  return { unified, path: path ?? '' }
}

export async function diffStaged(
  cwd: string,
  gitBinaryPath: string,
  path?: string,
  wordDiff = false
): Promise<GitDiffResult> {
  if (path && (await isSubmodulePath(cwd, gitBinaryPath, path))) {
    const args = buildDiffStagedArgs({ path, wordDiff, submodule: true })
    const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
    return { unified, path }
  }

  const args = buildDiffStagedArgs({ path, wordDiff })
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: path ?? '' }
}

export async function diffCommits(
  cwd: string,
  gitBinaryPath: string,
  fromRef: string,
  toRef: string,
  path?: string,
  mergeBase = false,
  paths?: string[]
): Promise<GitDiffResult> {
  const from = await resolveGitRef(cwd, gitBinaryPath, fromRef)
  const to = await resolveGitRef(cwd, gitBinaryPath, toRef)
  const args = buildDiffCommitsArgs({ from, to, path, paths, mergeBase })
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: path ?? paths?.join(', ') ?? '' }
}

export async function diffCommitRange(
  cwd: string,
  gitBinaryPath: string,
  oldestHash: string,
  newestHash: string
): Promise<GitDiffResult> {
  const oldest = await resolveGitRef(cwd, gitBinaryPath, oldestHash)
  const newest = await resolveGitRef(cwd, gitBinaryPath, newestHash)
  const hasParent =
    (await runGit(buildRevParseParentArgs(oldest), { cwd, gitBinaryPath })).code === 0
  const args = buildDiffCommitRangeArgs({ oldest, newest, hasParent })
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: `${oldest.slice(0, 7)}..${newest.slice(0, 7)}` }
}

export async function diffShow(
  cwd: string,
  gitBinaryPath: string,
  ref: string,
  path?: string
): Promise<GitDiffResult> {
  const resolvedRef = await resolveGitRef(cwd, gitBinaryPath, ref)
  const args = buildLogShowArgs({ ref: resolvedRef, path })
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: path ?? '' }
}

export async function fileRead(
  cwd: string,
  gitBinaryPath: string,
  ref: string,
  path: string
): Promise<string> {
  return runGitOrThrow(buildShowBlobArgs({ ref, path }), { cwd, gitBinaryPath })
}
