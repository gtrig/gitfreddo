import { buildLogGraphArgs, parseLogGraphOutput } from '../../../shared/gitLog'
import { runGitOrThrow } from '../git-runner'
import type { GitCommit } from '../types'

export async function logFile(
  cwd: string,
  gitBinaryPath: string,
  path: string,
  maxCount = 100
): Promise<GitCommit[]> {
  const args = buildLogGraphArgs(maxCount)
  args.push('--follow', '--', path)
  const stdout = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return parseLogGraphOutput(stdout) as GitCommit[]
}

export async function logPickaxe(
  cwd: string,
  gitBinaryPath: string,
  query: string,
  mode: 'pickaxe' | 'regex' = 'pickaxe',
  maxCount = 100
): Promise<GitCommit[]> {
  const args = buildLogGraphArgs(maxCount)
  if (mode === 'regex') {
    args.push('-G', query)
  } else {
    args.push('-S', query)
  }
  const stdout = await runGitOrThrow(args, { cwd, gitBinaryPath })
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
  const args = buildLogGraphArgs(maxCount)
  if (options.author?.trim()) args.push(`--author=${options.author.trim()}`)
  if (options.grep?.trim()) args.push(`--grep=${options.grep.trim()}`, '-i')
  if (options.since?.trim()) args.push(`--since=${options.since.trim()}`)
  if (options.until?.trim()) args.push(`--until=${options.until.trim()}`)
  const stdout = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return parseLogGraphOutput(stdout) as GitCommit[]
}
