import { defineCommand } from './_types'
import { NULL_DEVICE, withPaths, withWordDiff } from './_common'

export interface AddParams {
  paths?: readonly string[]
  all?: boolean
}

export function buildAddArgs({ paths, all }: AddParams): string[] {
  if (all || !paths || paths.length === 0) {
    return ['add', '-A']
  }
  return withPaths(['add'], paths)
}

export interface ResetHeadParams {
  paths?: readonly string[]
}

export function buildResetHeadArgs({ paths }: ResetHeadParams): string[] {
  if (!paths || paths.length === 0) {
    return ['reset', 'HEAD']
  }
  return withPaths(['reset', 'HEAD'], paths)
}

export type ResetMode = 'soft' | 'mixed' | 'hard'

export interface ResetModeParams {
  mode: ResetMode
  ref?: string
}

export function buildResetModeArgs({ mode, ref }: ResetModeParams): string[] {
  const args = ['reset', `--${mode}`]
  if (ref?.trim()) args.push(ref.trim())
  return args
}

export function buildResetHeadParentArgs(mode: ResetMode): string[] {
  return ['reset', `--${mode}`, 'HEAD~1']
}

export interface RestoreDiscardParams {
  paths: readonly string[]
  staged: boolean
}

export function buildRestoreDiscardArgs({ paths, staged }: RestoreDiscardParams): string[] {
  return staged
    ? withPaths(['restore', '--source=HEAD', '--staged', '--worktree'], paths)
    : withPaths(['restore', '--worktree'], paths)
}

export interface CheckoutDiscardParams {
  paths: readonly string[]
  staged: boolean
}

export function buildCheckoutDiscardArgs({ paths, staged }: CheckoutDiscardParams): string[] {
  return staged ? withPaths(['checkout', 'HEAD'], paths) : withPaths(['checkout'], paths)
}

export interface DiffWorkingParams {
  path?: string
  wordDiff?: boolean
  submodule?: boolean
}

export function buildDiffWorkingArgs({ path, wordDiff, submodule }: DiffWorkingParams): string[] {
  const base = submodule ? ['diff', '--submodule=log'] : ['diff']
  const args = withWordDiff(path ? withPaths(base, [path]) : base, wordDiff)
  return [...args]
}

export interface DiffStagedParams {
  path?: string
  wordDiff?: boolean
  submodule?: boolean
}

export function buildDiffStagedArgs({ path, wordDiff, submodule }: DiffStagedParams): string[] {
  const base = submodule ? ['diff', '--cached', '--submodule=log'] : ['diff', '--cached']
  const args = path ? withPaths(base, [path]) : base
  return [...withWordDiff(args, wordDiff)]
}

export interface DiffCommitsParams {
  from: string
  to: string
  path?: string
}

export function buildDiffCommitsArgs({ from, to, path }: DiffCommitsParams): string[] {
  const args = ['diff', from, to, '--']
  if (path) args.push(path)
  return args
}

export interface DiffCommitRangeParams {
  oldest: string
  newest: string
  hasParent: boolean
}

export function buildDiffCommitRangeArgs({ oldest, newest, hasParent }: DiffCommitRangeParams): string[] {
  return hasParent ? ['diff', `${oldest}^`, newest] : ['diff', oldest, newest]
}

export interface DiffNoIndexParams {
  path: string
}

export function buildDiffNoIndexArgs({ path }: DiffNoIndexParams): string[] {
  return ['diff', '--no-index', '--', NULL_DEVICE, path]
}

export const add = defineCommand({
  id: 'add',
  subcommand: 'add',
  buildArgs: buildAddArgs
})

export const resetHead = defineCommand({
  id: 'reset.head-paths',
  subcommand: 'reset',
  buildArgs: buildResetHeadArgs
})

export const resetMode = defineCommand({
  id: 'reset.mode',
  subcommand: 'reset',
  buildArgs: buildResetModeArgs
})

export const resetHeadParent = defineCommand({
  id: 'reset.head-parent',
  subcommand: 'reset',
  buildArgs: (mode: ResetMode) => buildResetHeadParentArgs(mode)
})

export const restoreDiscard = defineCommand({
  id: 'restore.discard',
  subcommand: 'restore',
  buildArgs: buildRestoreDiscardArgs
})

export const checkoutDiscard = defineCommand({
  id: 'checkout.discard',
  subcommand: 'checkout',
  buildArgs: buildCheckoutDiscardArgs
})

export const diffWorking = defineCommand({
  id: 'diff.working',
  subcommand: 'diff',
  buildArgs: buildDiffWorkingArgs
})

export const diffStaged = defineCommand({
  id: 'diff.staged',
  subcommand: 'diff',
  buildArgs: buildDiffStagedArgs
})

export const diffCommits = defineCommand({
  id: 'diff.commits',
  subcommand: 'diff',
  buildArgs: buildDiffCommitsArgs
})

export const diffCommitRange = defineCommand({
  id: 'diff.commit-range',
  subcommand: 'diff',
  buildArgs: buildDiffCommitRangeArgs
})

export const diffNoIndex = defineCommand({
  id: 'diff.no-index',
  subcommand: 'diff',
  buildArgs: buildDiffNoIndexArgs,
  acceptExitCodes: [1]
})
