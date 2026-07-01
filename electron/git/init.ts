import { resolve } from 'path'
import { emitLog } from './log-bus'
import { runGitOrThrow } from './git-runner'
import { hasGitDir } from './repo-path'

export async function initRepository(repoPath: string, gitBinaryPath = 'git'): Promise<string> {
  const normalized = resolve(repoPath)
  if (hasGitDir(normalized)) {
    throw new Error('This folder is already a git repository.')
  }

  emitLog('app', 'info', 'Initializing repository', normalized)
  await runGitOrThrow(['init'], { cwd: normalized, gitBinaryPath })
  emitLog('app', 'info', 'Repository initialized', normalized)
  return normalized
}
