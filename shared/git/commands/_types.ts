/** argv after global `-c color.ui=never` (injected by runner). */
export type GitArgv = string[]

export type GitEnv = Record<string, string | undefined>

export interface GitCommandDescriptor<TParams = void> {
  /** Stable ID, e.g. `switch.checkout`. */
  readonly id: string
  /** Git subcommand root, e.g. `switch`. */
  readonly subcommand: string
  buildArgs(params: TParams): GitArgv
  /** Success exit codes beyond 0 (e.g. `diff --no-index` returns 1). */
  acceptExitCodes?: readonly number[]
  /** Needs stdin (e.g. `git apply`). */
  stdin?: boolean | ((params: TParams) => string | undefined)
  /** Per-invocation env beyond `buildGitEnv()`. */
  env?: (params: TParams) => GitEnv | undefined
  /** Global `-c` overrides prepended before subcommand. */
  config?: readonly (readonly [string, string])[]
}

export function defineCommand<TParams = void>(
  descriptor: GitCommandDescriptor<TParams>
): GitCommandDescriptor<TParams> {
  return descriptor
}
