import { endOfOptionsArg } from './_common'
import { defineCommand } from './_types'

const TAG_LIST_FORMAT = [
  '%(refname)',
  '%(objectname)',
  '%(*objectname)',
  '%(objecttype)',
  '%(creatordate:iso8601)',
  '%(contents:subject)'
].join('%09')

export function buildTagListArgs(): string[] {
  return [
    'for-each-ref',
    '--sort=-creatordate',
    'refs/tags',
    'refs/remotes/*/tags',
    `--format=${TAG_LIST_FORMAT}`
  ]
}

export interface TagCreateParams {
  name: string
  target?: string
  message?: string
  sign?: boolean
}

export function buildTagCreateArgs({ name, target, message, sign }: TagCreateParams): string[] {
  const args = ['tag']
  if (sign) args.push('-s')
  const trimmedMessage = message?.trim()
  if (trimmedMessage) {
    args.push('-a', '-m', trimmedMessage)
  }
  args.push(...endOfOptionsArg(name))
  if (target?.trim()) args.push(target.trim())
  return args
}

export function buildTagDeleteArgs(name: string): string[] {
  return ['tag', '-d', ...endOfOptionsArg(name)]
}

export interface TagRenameParams {
  oldName: string
  newName: string
}

/** Create `newName` pointing at the same object as `oldName` (first step of rename). */
export function buildTagRenameCreateArgs({ oldName, newName }: TagRenameParams): string[] {
  return ['tag', '--end-of-options', newName, oldName]
}

/** Delete the old tag name after create (second step of rename). */
export function buildTagRenameDeleteArgs(oldName: string): string[] {
  return buildTagDeleteArgs(oldName)
}

export const tagList = defineCommand({
  id: 'tag.list',
  subcommand: 'for-each-ref',
  buildArgs: () => buildTagListArgs()
})

export const tagCreate = defineCommand({
  id: 'tag.create',
  subcommand: 'tag',
  buildArgs: buildTagCreateArgs
})

export const tagDelete = defineCommand({
  id: 'tag.delete',
  subcommand: 'tag',
  buildArgs: (name: string) => buildTagDeleteArgs(name)
})

export const tagRenameCreate = defineCommand({
  id: 'tag.rename-create',
  subcommand: 'tag',
  buildArgs: buildTagRenameCreateArgs
})

export const tagRenameDelete = defineCommand({
  id: 'tag.rename-delete',
  subcommand: 'tag',
  buildArgs: (oldName: string) => buildTagRenameDeleteArgs(oldName)
})
