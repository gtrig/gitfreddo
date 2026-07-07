import { defineCommand } from './_types'
import { endOfOptionsArg } from './_common'

export function buildBranchListArgs(): string[] {
  return ['branch', '-a', '-v', '--no-abbrev']
}

export interface BranchCreateParams {
  name: string
  startPoint?: string
}

export function buildBranchCreateArgs({ name, startPoint }: BranchCreateParams): string[] {
  const args = ['branch', ...endOfOptionsArg(name)]
  if (startPoint?.trim()) args.push(startPoint.trim())
  return args
}

export interface BranchDeleteParams {
  name: string
  force: boolean
}

export function buildBranchDeleteArgs({ name, force }: BranchDeleteParams): string[] {
  return ['branch', force ? '-D' : '-d', ...endOfOptionsArg(name)]
}

export interface BranchRenameParams {
  oldName: string
  newName: string
}

export function buildBranchRenameArgs({ oldName, newName }: BranchRenameParams): string[] {
  return ['branch', '-m', ...endOfOptionsArg(oldName), newName]
}

export interface BranchSetUpstreamParams {
  branch: string
  upstream: string
}

export function buildBranchSetUpstreamArgs({ branch, upstream }: BranchSetUpstreamParams): string[] {
  return ['branch', '--set-upstream-to', upstream, branch]
}

export function buildBranchUnsetUpstreamArgs(branch?: string): string[] {
  const args = ['branch', '--unset-upstream']
  if (branch?.trim()) args.push(branch.trim())
  return args
}

export function buildBranchShowCurrentArgs(): string[] {
  return ['branch', '--show-current']
}

export const branchList = defineCommand({
  id: 'branch.list',
  subcommand: 'branch',
  buildArgs: () => buildBranchListArgs()
})

export const branchCreate = defineCommand({
  id: 'branch.create',
  subcommand: 'branch',
  buildArgs: buildBranchCreateArgs
})

export const branchDelete = defineCommand({
  id: 'branch.delete',
  subcommand: 'branch',
  buildArgs: buildBranchDeleteArgs
})

export const branchRename = defineCommand({
  id: 'branch.rename',
  subcommand: 'branch',
  buildArgs: buildBranchRenameArgs
})

export const branchSetUpstream = defineCommand({
  id: 'branch.set-upstream',
  subcommand: 'branch',
  buildArgs: buildBranchSetUpstreamArgs
})

export const branchUnsetUpstream = defineCommand({
  id: 'branch.unset-upstream',
  subcommand: 'branch',
  buildArgs: (branch?: string) => buildBranchUnsetUpstreamArgs(branch)
})

export const branchShowCurrent = defineCommand({
  id: 'branch.show-current',
  subcommand: 'branch',
  buildArgs: () => buildBranchShowCurrentArgs()
})
