import type { GitArgv } from './_types'

/** Append `--` followed by path arguments. */
export function withPaths(args: GitArgv, paths: readonly string[]): GitArgv {
  if (paths.length === 0) return args
  return [...args, '--', ...paths]
}

/** Safe ref separator for branch names that may look like options. */
export function endOfOptionsArg(ref: string): GitArgv {
  return ['--end-of-options', ref]
}

export function localBranchRef(name: string): string {
  return `refs/heads/${name}`
}

export function commitRef(name: string): string {
  return `${name}^{commit}`
}

export function parentRef(ref: string): string {
  return `${ref}^`
}

/** `rev-list --left-right --count upstream...branch` */
export function aheadBehindArgs(upstream: string, branch: string): GitArgv {
  return ['rev-list', '--left-right', '--count', `${upstream}...${branch}`]
}

/** `rev-list --left-right --count @{upstream}...HEAD` */
export function upstreamAheadBehindArgs(): GitArgv {
  return aheadBehindArgs('@{upstream}', 'HEAD')
}

export function withWordDiff(args: GitArgv, wordDiff?: boolean): GitArgv {
  if (!wordDiff) return args
  const insertAt = args[0] === 'diff' || args[0] === 'show' ? 1 : 0
  return [...args.slice(0, insertAt), '--word-diff=plain', ...args.slice(insertAt)]
}

export const NULL_DEVICE = typeof process !== 'undefined' && process.platform === 'win32' ? 'NUL' : '/dev/null'
