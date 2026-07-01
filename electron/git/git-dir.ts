import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { runGitOrThrow } from './git-runner'

export async function resolveGitDir(cwd: string, gitBinaryPath: string): Promise<string> {
  const out = (
    await runGitOrThrow(['rev-parse', '--absolute-git-dir'], { cwd, gitBinaryPath })
  ).trim()
  return resolve(out)
}

export async function resolveGitCommonDir(cwd: string, gitBinaryPath: string): Promise<string> {
  const out = (
    await runGitOrThrow(['rev-parse', '--git-common-dir'], { cwd, gitBinaryPath })
  ).trim()
  const gitDir = await resolveGitDir(cwd, gitBinaryPath)
  if (out === '.git' || out === 'git') {
    return gitDir
  }
  return resolve(gitDir, out)
}

export async function gitMetadataPath(
  cwd: string,
  gitBinaryPath: string,
  name: string
): Promise<string> {
  const gitDir = await resolveGitDir(cwd, gitBinaryPath)
  return join(gitDir, name)
}

export async function gitMetadataExists(
  cwd: string,
  gitBinaryPath: string,
  name: string
): Promise<boolean> {
  const path = await gitMetadataPath(cwd, gitBinaryPath, name)
  return existsSync(path)
}

export async function readGitMetadataFile(
  cwd: string,
  gitBinaryPath: string,
  name: string
): Promise<string | undefined> {
  try {
    const path = await gitMetadataPath(cwd, gitBinaryPath, name)
    return readFileSync(path, 'utf8').trim()
  } catch {
    return undefined
  }
}

export async function rebaseInProgress(cwd: string, gitBinaryPath: string): Promise<boolean> {
  const gitDir = await resolveGitDir(cwd, gitBinaryPath)
  return (
    existsSync(join(gitDir, 'rebase-merge')) || existsSync(join(gitDir, 'rebase-apply'))
  )
}
