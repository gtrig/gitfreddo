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
    args.push('-a', name, '-m', trimmedMessage)
  } else {
    args.push(name)
  }
  if (target?.trim()) args.push(target.trim())
  return args
}

export function buildTagDeleteArgs(name: string): string[] {
  return ['tag', '-d', name]
}

export interface TagRenameParams {
  oldName: string
  newName: string
}

export function buildTagRenameArgs({ oldName, newName }: TagRenameParams): string[] {
  return ['tag', oldName, newName]
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

export const tagRename = defineCommand({
  id: 'tag.rename',
  subcommand: 'tag',
  buildArgs: buildTagRenameArgs
})
