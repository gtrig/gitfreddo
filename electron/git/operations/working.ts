import { writeFile, mkdir, readFile, access } from 'fs/promises'
import { dirname } from 'path'
import { appendGitignoreEntry } from '../../../shared/gitignore'
import type { WorkingReadResult } from '../../../shared/working'
import { runGit, runGitOrThrow } from '../git-runner'
import { resolveRepoFile } from '../workspace-files'

const GITIGNORE_PATH = '.gitignore'

export async function workingWrite(
  cwd: string,
  gitBinaryPath: string,
  relativePath: string,
  content: string
): Promise<void> {
  const root = (await runGitOrThrow(['rev-parse', '--show-toplevel'], { cwd, gitBinaryPath })).trim()
  const target = resolveRepoFile(root, relativePath)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, content, 'utf8')
}

export async function workingRead(
  cwd: string,
  gitBinaryPath: string,
  relativePath: string
): Promise<WorkingReadResult> {
  const root = (await runGitOrThrow(['rev-parse', '--show-toplevel'], { cwd, gitBinaryPath })).trim()
  const target = resolveRepoFile(root, relativePath)
  try {
    await access(target)
  } catch {
    return { exists: false, content: '' }
  }
  const content = await readFile(target, 'utf8')
  return { exists: true, content }
}

export async function workingRename(
  cwd: string,
  gitBinaryPath: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  await runGitOrThrow(['mv', '--', oldPath, newPath], { cwd, gitBinaryPath })
}

export async function stageApplyPatch(
  cwd: string,
  gitBinaryPath: string,
  patch: string,
  reverse = false
): Promise<void> {
  const args = ['apply', '--cached']
  if (reverse) args.push('--reverse')
  const result = await runGit(args, {
    cwd,
    gitBinaryPath,
    input: patch
  })
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || 'Failed to apply patch')
  }
}

export async function fileReadStage(
  cwd: string,
  gitBinaryPath: string,
  stage: 1 | 2 | 3,
  path: string
): Promise<string> {
  return runGitOrThrow(['show', `:${stage}:${path}`], { cwd, gitBinaryPath })
}

export async function workingAddToGitignore(
  cwd: string,
  gitBinaryPath: string,
  relativePath: string,
  directory = false
): Promise<void> {
  const normalized = relativePath.replace(/^\//, '').replace(/\/+$/, '')
  if (!normalized || normalized === GITIGNORE_PATH) {
    throw new Error('Cannot add .gitignore to itself.')
  }

  let content = ''
  const readResult = await workingRead(cwd, gitBinaryPath, GITIGNORE_PATH)
  content = readResult.content

  const updated = appendGitignoreEntry(content, normalized, directory)
  if (updated !== content) {
    await workingWrite(cwd, gitBinaryPath, GITIGNORE_PATH, updated)
  }

  if (directory) {
    const prefix = `${normalized}/`
    const listed = await runGit(['ls-files', '--', prefix], { cwd, gitBinaryPath })
    if (listed.stdout.trim()) {
      await runGitOrThrow(['rm', '--cached', '-r', '-f', '--', prefix], { cwd, gitBinaryPath })
    }
    return
  }

  const tracked = await runGit(['ls-files', '--error-unmatch', '--', normalized], {
    cwd,
    gitBinaryPath
  })
  if (tracked.code === 0) {
    await runGitOrThrow(['rm', '--cached', '-f', '--', normalized], { cwd, gitBinaryPath })
  }
}
