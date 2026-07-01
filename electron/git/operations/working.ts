import { writeFile, mkdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import { runGit, runGitOrThrow } from '../git-runner'

export async function workingWrite(
  cwd: string,
  gitBinaryPath: string,
  relativePath: string,
  content: string
): Promise<void> {
  const root = (await runGitOrThrow(['rev-parse', '--show-toplevel'], { cwd, gitBinaryPath })).trim()
  const target = resolve(root, relativePath)
  if (!target.startsWith(root + '/') && target !== root) {
    throw new Error('Path escapes repository root.')
  }
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, content, 'utf8')
}

export async function workingRead(
  cwd: string,
  gitBinaryPath: string,
  relativePath: string
): Promise<string> {
  const root = (await runGitOrThrow(['rev-parse', '--show-toplevel'], { cwd, gitBinaryPath })).trim()
  const target = resolve(root, relativePath)
  if (!target.startsWith(root + '/') && target !== root) {
    throw new Error('Path escapes repository root.')
  }
  const { readFile } = await import('fs/promises')
  return readFile(target, 'utf8')
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
