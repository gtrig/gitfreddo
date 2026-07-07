import { defineCommand } from './_types'

export interface MergeStartParams {
  branch: string
  noFf?: boolean
  squash?: boolean
}

export function buildMergeStartArgs({ branch, noFf, squash }: MergeStartParams): string[] {
  const args = ['merge']
  if (noFf) args.push('--no-ff')
  if (squash) args.push('--squash')
  args.push(branch)
  return args
}

export function buildMergeAbortArgs(): string[] {
  return ['merge', '--abort']
}

export function buildMergeContinueArgs(): string[] {
  return ['merge', '--continue']
}

export interface RebaseStartParams {
  onto: string
  from?: string
}

export function buildRebaseStartArgs({ onto, from }: RebaseStartParams): string[] {
  if (from?.trim()) {
    return ['rebase', '--onto', onto, from.trim()]
  }
  return ['rebase', onto]
}

export function buildRebaseAbortArgs(): string[] {
  return ['rebase', '--abort']
}

export function buildRebaseContinueArgs(): string[] {
  return ['rebase', '--continue']
}

export function buildRebaseSkipArgs(): string[] {
  return ['rebase', '--skip']
}

export interface RebaseInteractiveParams {
  baseHash?: string
  root?: boolean
}

export function buildRebaseInteractiveArgs({ baseHash, root }: RebaseInteractiveParams): string[] {
  if (root) return ['rebase', '-i', '--root']
  return ['rebase', '-i', `${baseHash}^`]
}

export interface CherryPickParams {
  hash: string
  noCommit?: boolean
  mainline?: number
}

export function buildCherryPickArgs({ hash, noCommit, mainline }: CherryPickParams): string[] {
  const args = ['cherry-pick']
  if (noCommit) args.push('-n')
  if (typeof mainline === 'number') args.push('-m', String(mainline))
  args.push(hash)
  return args
}

export function buildCherryPickContinueArgs(): string[] {
  return ['cherry-pick', '--continue']
}

export function buildCherryPickAbortArgs(): string[] {
  return ['cherry-pick', '--abort']
}

export function buildCherryPickSkipArgs(): string[] {
  return ['cherry-pick', '--skip']
}

export interface RevertParams {
  hash: string
  mainline?: number
}

export function buildRevertArgs({ hash, mainline }: RevertParams): string[] {
  const args = ['revert', '--no-edit']
  if (typeof mainline === 'number') args.push('-m', String(mainline))
  args.push(hash)
  return args
}

export interface MergeBaseIsAncestorParams {
  ancestor: string
  descendant: string
}

export function buildMergeBaseIsAncestorArgs({ ancestor, descendant }: MergeBaseIsAncestorParams): string[] {
  return ['merge-base', '--is-ancestor', ancestor, descendant]
}

export const mergeStart = defineCommand({
  id: 'merge.start',
  subcommand: 'merge',
  buildArgs: buildMergeStartArgs,
  acceptExitCodes: [1]
})

export const mergeAbort = defineCommand({
  id: 'merge.abort',
  subcommand: 'merge',
  buildArgs: () => buildMergeAbortArgs()
})

export const mergeContinue = defineCommand({
  id: 'merge.continue',
  subcommand: 'merge',
  buildArgs: () => buildMergeContinueArgs()
})

export const rebaseStart = defineCommand({
  id: 'rebase.start',
  subcommand: 'rebase',
  buildArgs: buildRebaseStartArgs
})

export const rebaseAbort = defineCommand({
  id: 'rebase.abort',
  subcommand: 'rebase',
  buildArgs: () => buildRebaseAbortArgs()
})

export const rebaseContinue = defineCommand({
  id: 'rebase.continue',
  subcommand: 'rebase',
  buildArgs: () => buildRebaseContinueArgs()
})

export const rebaseSkip = defineCommand({
  id: 'rebase.skip',
  subcommand: 'rebase',
  buildArgs: () => buildRebaseSkipArgs()
})

export const cherryPick = defineCommand({
  id: 'cherry-pick',
  subcommand: 'cherry-pick',
  buildArgs: buildCherryPickArgs
})

export const cherryPickContinue = defineCommand({
  id: 'cherry-pick.continue',
  subcommand: 'cherry-pick',
  buildArgs: () => buildCherryPickContinueArgs()
})

export const cherryPickAbort = defineCommand({
  id: 'cherry-pick.abort',
  subcommand: 'cherry-pick',
  buildArgs: () => buildCherryPickAbortArgs()
})

export const cherryPickSkip = defineCommand({
  id: 'cherry-pick.skip',
  subcommand: 'cherry-pick',
  buildArgs: () => buildCherryPickSkipArgs()
})

export const revert = defineCommand({
  id: 'revert',
  subcommand: 'revert',
  buildArgs: buildRevertArgs
})

export const mergeBaseIsAncestor = defineCommand({
  id: 'merge-base.is-ancestor',
  subcommand: 'merge-base',
  buildArgs: buildMergeBaseIsAncestorArgs,
  acceptExitCodes: [1]
})
