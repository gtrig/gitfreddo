import { resolve } from 'path'
import { buildInitArgs } from '../../shared/git/commands'
import { emitLog } from './log-bus'
import { runGitOrThrow } from './git-runner'
import { hasGitDir } from './repo-path'

export async function initRepository(repoPath: string, gitBinaryPath = 'git'): Promise<string> {
  const normalized = resolve(repoPath)
  if (hasGitDir(normalized)) {
    throw new Error('This folder is already a git repository.')
  }

  emitLog('app', 'info', 'Initializing repository', normalized)
  await runGitOrThrow(buildInitArgs(), { cwd: normalized, gitBinaryPath })
  emitLog('app', 'info', 'Repository initialized', normalized)
  return normalized
}
