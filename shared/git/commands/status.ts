import { defineCommand } from './_types'

export function buildStatusPorcelainArgs(): string[] {
  return ['status', '--porcelain=2', '-b', '-uall']
}

export function buildDiffConflictNamesArgs(): string[] {
  return ['diff', '--name-only', '--diff-filter=U']
}

export const statusPorcelain = defineCommand({
  id: 'status.porcelain',
  subcommand: 'status',
  buildArgs: () => buildStatusPorcelainArgs()
})

export const diffConflictNames = defineCommand({
  id: 'diff.conflict-names',
  subcommand: 'diff',
  buildArgs: () => buildDiffConflictNamesArgs()
})
