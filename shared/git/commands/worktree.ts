import { defineCommand } from './_types'

export function buildWorktreeListArgs(): string[] {
  return ['worktree', 'list', '--porcelain']
}

export interface WorktreeAddParams {
  path: string
  branch?: string
  newBranch?: string
  detach?: boolean
  commit?: string
}

export function buildWorktreeAddArgs(params: WorktreeAddParams): string[] {
  const args = ['worktree', 'add']
  if (params.detach) args.push('--detach')
  if (params.newBranch) args.push('-b', params.newBranch)
  args.push(params.path)
  if (params.branch) {
    args.push(params.branch)
  } else if (params.commit) {
    args.push(params.commit)
  }
  return args
}

export interface WorktreeRemoveParams {
  path: string
  force?: boolean
}

export function buildWorktreeRemoveArgs({ path, force }: WorktreeRemoveParams): string[] {
  const args = ['worktree', 'remove']
  if (force) args.push('--force')
  args.push(path)
  return args
}

export function buildWorktreePruneArgs(): string[] {
  return ['worktree', 'prune']
}

export const worktreeList = defineCommand({
  id: 'worktree.list',
  subcommand: 'worktree',
  buildArgs: () => buildWorktreeListArgs()
})

export const worktreeAdd = defineCommand({
  id: 'worktree.add',
  subcommand: 'worktree',
  buildArgs: buildWorktreeAddArgs
})

export const worktreeRemove = defineCommand({
  id: 'worktree.remove',
  subcommand: 'worktree',
  buildArgs: buildWorktreeRemoveArgs
})

export const worktreePrune = defineCommand({
  id: 'worktree.prune',
  subcommand: 'worktree',
  buildArgs: () => buildWorktreePruneArgs()
})
