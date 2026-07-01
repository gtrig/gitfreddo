import { resolveGitRef, runGit, runGitOrThrow } from '../git-runner'
import type { GitDiffResult } from '../types'

const NULL_DEVICE = process.platform === 'win32' ? 'NUL' : '/dev/null'

function withWordDiff(args: string[], wordDiff?: boolean): string[] {
  if (!wordDiff) return args
  const insertAt = args[0] === 'diff' || args[0] === 'show' ? 1 : 0
  return [...args.slice(0, insertAt), '--word-diff=plain', ...args.slice(insertAt)]
}

async function isUntrackedPath(
  cwd: string,
  gitBinaryPath: string,
  path: string
): Promise<boolean> {
  const result = await runGit(['ls-files', '--others', '--exclude-standard', '--', path], {
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
  const result = await runGit(['diff', '--no-index', '--', NULL_DEVICE, path], {
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
  const args = withWordDiff(['diff', '--'], wordDiff)
  if (path) args.push(path)
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
  const args = withWordDiff(['diff', '--cached', '--'], wordDiff)
  if (path) args.push(path)
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: path ?? '' }
}

export async function diffCommits(
  cwd: string,
  gitBinaryPath: string,
  fromRef: string,
  toRef: string,
  path?: string
): Promise<GitDiffResult> {
  const from = await resolveGitRef(cwd, gitBinaryPath, fromRef)
  const to = await resolveGitRef(cwd, gitBinaryPath, toRef)
  const args = ['diff', from, to, '--']
  if (path) args.push(path)
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: path ?? '' }
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
    (await runGit(['rev-parse', '--verify', `${oldest}^`], { cwd, gitBinaryPath })).code === 0
  const args = hasParent ? ['diff', `${oldest}^`, newest] : ['diff', oldest, newest]
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
  const args = ['show', '-m', '--first-parent', resolvedRef, '--']
  if (path) args.push(path)
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: path ?? '' }
}

export async function fileRead(
  cwd: string,
  gitBinaryPath: string,
  ref: string,
  path: string
): Promise<string> {
  return runGitOrThrow(['show', `${ref}:${path}`], { cwd, gitBinaryPath })
}
