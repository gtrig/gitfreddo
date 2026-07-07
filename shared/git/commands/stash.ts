import { defineCommand } from './_types'
import { withPaths } from './_common'

export function buildStashListArgs(): string[] {
  return ['stash', 'list', '--format=%gd%x1f%H%x1f%s']
}

export interface StashPushParams {
  message?: string
  includeUntracked?: boolean
  includeIgnored?: boolean
  paths?: readonly string[]
}

export function buildStashPushArgs(params: StashPushParams): string[] {
  const args = ['stash', 'push']
  if (params.includeIgnored) args.push('-a')
  else if (params.includeUntracked) args.push('-u')
  if (params.message) args.push('-m', params.message)
  if (params.paths && params.paths.length > 0) {
    return withPaths(args, params.paths)
  }
  return args
}

export interface StashRefParams {
  index: number
}

export function stashRef(index: number): string {
  return `stash@{${index}}`
}

export function buildStashBranchArgs(branchName: string, index: number): string[] {
  return ['stash', 'branch', branchName, stashRef(index)]
}

export function buildStashPopArgs(index: number): string[] {
  return ['stash', 'pop', stashRef(index)]
}

export function buildStashApplyArgs(index: number): string[] {
  return ['stash', 'apply', stashRef(index)]
}

export function buildStashDropArgs(index: number): string[] {
  return ['stash', 'drop', stashRef(index)]
}

export interface StashShowParams {
  index: number
  path?: string
}

export function buildStashShowArgs({ index, path }: StashShowParams): string[] {
  const args = ['stash', 'show', '-p', stashRef(index)]
  if (path) return withPaths(args, [path])
  return args
}

export function buildStashFilesArgs(index: number): string[] {
  return ['stash', 'show', '--name-status', stashRef(index)]
}

export const stashList = defineCommand({
  id: 'stash.list',
  subcommand: 'stash',
  buildArgs: () => buildStashListArgs()
})

export const stashPush = defineCommand({
  id: 'stash.push',
  subcommand: 'stash',
  buildArgs: buildStashPushArgs
})

export const stashPop = defineCommand({
  id: 'stash.pop',
  subcommand: 'stash',
  buildArgs: (index: number) => buildStashPopArgs(index)
})
