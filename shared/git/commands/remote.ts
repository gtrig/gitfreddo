import type { PushSubmoduleRecursion, SubmoduleRecursion } from '../../submodule-types'
import {
  pushSubmoduleRecursionArgs,
  submoduleRecursionFetchArgs
} from '../../submodule-types'
import { defineCommand } from './_types'

export function buildRemoteListArgs(): string[] {
  return ['remote', '-v']
}

export interface RemoteAddParams {
  name: string
  url: string
}

export function buildRemoteAddArgs({ name, url }: RemoteAddParams): string[] {
  return ['remote', 'add', name, url]
}

export function buildRemoteRemoveArgs(name: string): string[] {
  return ['remote', 'remove', name]
}

export interface RemoteRenameParams {
  oldName: string
  newName: string
}

export function buildRemoteRenameArgs({ oldName, newName }: RemoteRenameParams): string[] {
  return ['remote', 'rename', oldName, newName]
}

export interface RemoteSetUrlParams {
  name: string
  url: string
  push?: boolean
}

export function buildRemoteSetUrlArgs({ name, url, push }: RemoteSetUrlParams): string[] {
  const args = ['remote', 'set-url']
  if (push) args.push('--push')
  args.push(name, url)
  return args
}

export function buildRemoteGetUrlArgs(name: string): string[] {
  return ['remote', 'get-url', name]
}

export interface FetchParams {
  remote: string
  tags?: boolean
  tagsOnly?: boolean
  refspec?: string
  submoduleRecursion?: SubmoduleRecursion
}

export function buildFetchArgs(params: FetchParams): string[] {
  if (params.tagsOnly) {
    return ['fetch', '--tags', params.remote]
  }

  const args = ['fetch', '--prune']
  if (params.tags) args.push('--tags')
  args.push(...submoduleRecursionFetchArgs(params.submoduleRecursion ?? 'none'))
  args.push(params.remote)
  if (params.refspec?.trim()) args.push(params.refspec.trim())
  return args
}

export interface PushParams {
  remote: string
  branch?: string
  setUpstream?: boolean
  force?: boolean
  pushAll?: boolean
  pushSubmoduleRecursion?: PushSubmoduleRecursion
}

export function buildPushArgs(params: PushParams): string[] {
  const args = ['push']
  if (params.force) args.push('--force-with-lease')
  args.push(...pushSubmoduleRecursionArgs(params.pushSubmoduleRecursion ?? 'no'))

  if (params.pushAll) {
    args.push('--all', params.remote)
    return args
  }

  if (params.setUpstream) args.push('-u')
  args.push(params.remote)
  if (params.branch) args.push(params.branch)
  return args
}

export interface PushDeleteBranchParams {
  remote: string
  branch: string
}

export function buildPushDeleteBranchArgs({ remote, branch }: PushDeleteBranchParams): string[] {
  return ['push', remote, `:refs/heads/${branch}`]
}

export interface PushTagParams {
  remote: string
  tag?: string
  allTags?: boolean
}

export function buildPushTagArgs({ remote, tag, allTags }: PushTagParams): string[] {
  if (allTags) return ['push', remote, '--tags']
  return ['push', remote, tag!]
}

export interface PushDeleteTagParams {
  remote: string
  tag: string
}

export function buildPushDeleteTagArgs({ remote, tag }: PushDeleteTagParams): string[] {
  return ['push', remote, `:refs/tags/${tag}`]
}

export interface PullParams {
  remote: string
  branch?: string
  rebase?: boolean
  submoduleRecursion?: SubmoduleRecursion
}

export function buildPullArgs(params: PullParams): string[] {
  const args = ['pull']
  if (params.rebase) args.push('--rebase')
  args.push(...submoduleRecursionFetchArgs(params.submoduleRecursion ?? 'none'))
  args.push(params.remote)
  if (params.branch?.trim()) args.push(params.branch.trim())
  return args
}

export const remoteList = defineCommand({
  id: 'remote.list',
  subcommand: 'remote',
  buildArgs: () => buildRemoteListArgs()
})

export const remoteAdd = defineCommand({
  id: 'remote.add',
  subcommand: 'remote',
  buildArgs: buildRemoteAddArgs
})

export const remoteGetUrl = defineCommand({
  id: 'remote.get-url',
  subcommand: 'remote',
  buildArgs: (name: string) => buildRemoteGetUrlArgs(name)
})

export const fetch = defineCommand({
  id: 'fetch',
  subcommand: 'fetch',
  buildArgs: buildFetchArgs
})

export const push = defineCommand({
  id: 'push',
  subcommand: 'push',
  buildArgs: buildPushArgs
})

export const pull = defineCommand({
  id: 'pull',
  subcommand: 'pull',
  buildArgs: buildPullArgs
})
