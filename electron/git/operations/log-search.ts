import {
  buildLogFileArgs,
  buildLogGraphArgs,
  buildLogPickaxeArgs,
  buildLogSearchArgs,
  parseLogGraphOutput
} from '../../../shared/gitLog'
import { runGitOrThrow } from '../git-runner'
import type { GitCommit } from '../types'

export async function logFile(
  cwd: string,
  gitBinaryPath: string,
  path: string,
  maxCount = 100
): Promise<GitCommit[]> {
  const stdout = await runGitOrThrow(buildLogFileArgs({ maxCount, path }), { cwd, gitBinaryPath })
  return parseLogGraphOutput(stdout) as GitCommit[]
}

export async function logPickaxe(
  cwd: string,
  gitBinaryPath: string,
  query: string,
  mode: 'pickaxe' | 'regex' = 'pickaxe',
  maxCount = 100
): Promise<GitCommit[]> {
  const stdout = await runGitOrThrow(
    buildLogPickaxeArgs({ maxCount, query, mode }),
    { cwd, gitBinaryPath }
  )
  return parseLogGraphOutput(stdout) as GitCommit[]
}

export async function logSearch(
  cwd: string,
  gitBinaryPath: string,
  options: {
    author?: string
    grep?: string
    since?: string
    until?: string
    maxCount?: number
  }
): Promise<GitCommit[]> {
  const maxCount = options.maxCount ?? 200
  const stdout = await runGitOrThrow(buildLogSearchArgs({ ...options, maxCount }), {
    cwd,
    gitBinaryPath
  })
  return parseLogGraphOutput(stdout) as GitCommit[]
}

// Re-export for tests that import buildLogGraphArgs from this module
export { buildLogGraphArgs }
