import { defineCommand } from './_types'
import { withPaths } from './_common'
import type { SubmoduleRecursion } from '../../submodule-types'
import { submoduleRecursionCloneArgs } from '../../submodule-types'

export function buildFsckUnreachableArgs(): string[] {
  return ['fsck', '--unreachable', '--no-reflogs']
}

export function buildReflogExpireArgs(): string[] {
  return ['reflog', 'expire', '--expire=now', '--all']
}

export function buildGcPruneArgs(): string[] {
  return ['gc', '--prune=now']
}

export function buildSymbolicRefHeadArgs(): string[] {
  return ['symbolic-ref', 'HEAD']
}

export function buildUpdateRefDeleteArgs(ref: string): string[] {
  return ['update-ref', '-d', ref]
}

export interface ForEachRefStaleParams {
  format: string
}

export function buildForEachRefArgs(refs: string, format: string): string[] {
  return ['for-each-ref', refs, `--format=${format}`]
}

export interface ReflogListParams {
  maxCount: number
  format?: string
}

export function buildReflogListArgs({ maxCount, format }: ReflogListParams): string[] {
  const fmt = format ?? '%H%x09%gs%x09%ci'
  return ['reflog', `--format=${fmt}`, '-n', String(maxCount)]
}

export function buildReflogShowHeadArgs(count: number, format: string): string[] {
  return ['reflog', 'show', 'HEAD', `-${count}`, `--format=${format}`]
}

export interface BisectStartParams {
  badRef: string
  goodRef?: string
}

export function buildBisectStartArgs({ badRef, goodRef }: BisectStartParams): string[] {
  const args = ['bisect', 'start', badRef]
  if (goodRef?.trim()) args.push(goodRef.trim())
  return args
}

export function buildBisectGoodArgs(ref?: string): string[] {
  const args = ['bisect', 'good']
  if (ref?.trim()) args.push(ref.trim())
  return args
}

export function buildBisectBadArgs(ref?: string): string[] {
  const args = ['bisect', 'bad']
  if (ref?.trim()) args.push(ref.trim())
  return args
}

export function buildBisectResetArgs(): string[] {
  return ['bisect', 'reset']
}

export function buildBisectLogArgs(): string[] {
  return ['bisect', 'log']
}

export function buildNotesListArgs(): string[] {
  return ['notes', 'list']
}

export function buildNotesShowArgs(hash: string): string[] {
  return ['notes', 'show', hash]
}

export interface NotesAddParams {
  hash: string
  message: string
  force?: boolean
}

export function buildNotesAddArgs({ hash, message, force }: NotesAddParams): string[] {
  const args = ['notes', 'add']
  if (force) args.push('-f')
  args.push('-m', message, hash)
  return args
}

export interface ConfigGetParams {
  key: string
  scope: 'local' | 'global'
}

export function buildConfigGetArgs({ key, scope }: ConfigGetParams): string[] {
  return ['config', `--${scope}`, key]
}

export interface ConfigSetParams {
  key: string
  value: string
  scope: 'local' | 'global'
}

export function buildConfigSetArgs({ key, value, scope }: ConfigSetParams): string[] {
  return ['config', `--${scope}`, key, value]
}

export function buildConfigListArgs(scope: 'local' | 'global'): string[] {
  return ['config', `--${scope}`, '--list']
}

export interface BlameParams {
  path: string
  ref?: string
}

export function buildBlameArgs({ path, ref }: BlameParams): string[] {
  const args = ['blame', '--line-porcelain']
  if (ref) args.push(ref)
  return withPaths(args, [path])
}

export interface ShowBlobParams {
  ref: string
  path: string
}

export function buildShowBlobArgs({ ref, path }: ShowBlobParams): string[] {
  return ['show', `${ref}:${path}`]
}

export interface ShowStageParams {
  stage: 1 | 2 | 3
  path: string
}

export function buildShowStageArgs({ stage, path }: ShowStageParams): string[] {
  return ['show', `:${stage}:${path}`]
}

export interface ApplyPatchParams {
  patch: string
  reverse?: boolean
}

export function buildApplyPatchArgs({ reverse }: ApplyPatchParams): string[] {
  const args = ['apply', '--cached']
  if (reverse) args.push('--reverse')
  return args
}

export interface CleanParams {
  dryRun: boolean
  includeIgnored?: boolean
}

export function buildCleanArgs({ dryRun, includeIgnored }: CleanParams): string[] {
  const args = ['clean', dryRun ? '-fdn' : '-fd']
  if (includeIgnored) args.push('-x')
  return args
}

export interface CommitParams {
  message: string
  amend?: boolean
  sign?: boolean
}

export function buildCommitArgs({ message, amend, sign }: CommitParams): string[] {
  const args = ['commit', '-m', message]
  if (amend) args.push('--amend')
  if (sign) args.push('-S')
  return args
}

export function buildCommitFileArgs(filePath: string): string[] {
  return ['commit', '-F', filePath]
}

export interface CloneParams {
  url: string
  targetPath: string
  submoduleRecursion?: SubmoduleRecursion
}

export function buildCloneArgs({ url, targetPath, submoduleRecursion }: CloneParams): string[] {
  return ['clone', ...submoduleRecursionCloneArgs(submoduleRecursion ?? 'on-demand'), '--', url, targetPath]
}

export function buildInitArgs(): string[] {
  return ['init']
}

export function buildLsFilesOthersArgs(path: string): string[] {
  return ['ls-files', '--others', '--exclude-standard', '--', path]
}

export function buildLsFilesArgs(): string[] {
  return ['ls-files', '-s']
}

export interface LsFilesMatchParams {
  path: string
}

export function buildLsFilesMatchArgs({ path }: LsFilesMatchParams): string[] {
  return ['ls-files', '-s', '--', path]
}

export function buildLsFilesErrorUnmatchArgs(path: string): string[] {
  return ['ls-files', '--error-unmatch', '--', path]
}

export interface RmParams {
  paths: readonly string[]
  force?: boolean
  cached?: boolean
  recursive?: boolean
}

export function buildRmArgs({ paths, force, cached, recursive }: RmParams): string[] {
  const args = ['rm']
  if (force) args.push('-f')
  if (cached) args.push('--cached')
  if (recursive) args.push('-r')
  return withPaths(args, paths)
}

export interface MvParams {
  oldPath: string
  newPath: string
}

export function buildMvArgs({ oldPath, newPath }: MvParams): string[] {
  return withPaths(['mv'], [oldPath, newPath])
}

export const fsckUnreachable = defineCommand({
  id: 'maintenance.fsck-unreachable',
  subcommand: 'fsck',
  buildArgs: () => buildFsckUnreachableArgs(),
  acceptExitCodes: [0, 1, 2]
})

export const bisectLog = defineCommand({
  id: 'bisect.log',
  subcommand: 'bisect',
  buildArgs: () => buildBisectLogArgs(),
  acceptExitCodes: [0, 1]
})

export const applyPatch = defineCommand({
  id: 'apply.patch',
  subcommand: 'apply',
  buildArgs: buildApplyPatchArgs,
  stdin: (params) => params.patch
})

export const clone = defineCommand({
  id: 'clone',
  subcommand: 'clone',
  buildArgs: buildCloneArgs
})

export const init = defineCommand({
  id: 'init',
  subcommand: 'init',
  buildArgs: () => buildInitArgs()
})
