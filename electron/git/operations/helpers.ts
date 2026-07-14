import type { RunGitOptions } from '../git-runner'

export interface GitCtx {
  cwd: string
  gitBinaryPath: string
}

export function toGitOptions(ctx: GitCtx): RunGitOptions {
  return { cwd: ctx.cwd, gitBinaryPath: ctx.gitBinaryPath }
}

/**
 * Split git stdout into non-empty trimmed lines and map/filter via parseLine.
 */
export function parseLines<T>(
  stdout: string,
  parseLine: (line: string) => T | null
): T[] {
  if (!stdout.trim()) return []
  return stdout
    .split('\n')
    .map((line) => parseLine(line))
    .filter((item): item is T => item !== null)
}
