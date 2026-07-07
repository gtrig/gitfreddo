import { defineCommand } from './_types'
import { withPaths } from './_common'

function withFileProtocolAllow(args: string[]): string[] {
  return ['-c', 'protocol.file.allow=always', ...args]
}

export function buildSubmoduleStatusArgs(): string[] {
  return ['submodule', 'status', '--recursive']
}

export interface SubmoduleAddParams {
  url: string
  path: string
  branch?: string
}

export function buildSubmoduleAddArgs({ url, path, branch }: SubmoduleAddParams): string[] {
  const args = ['submodule', 'add']
  if (branch?.trim()) args.push('-b', branch.trim())
  args.push(url, path)
  return withFileProtocolAllow(args)
}

export interface SubmoduleInitParams {
  paths?: readonly string[]
  recursive?: boolean
}

export function buildSubmoduleInitArgs({ paths, recursive }: SubmoduleInitParams): string[] {
  const args = ['submodule', 'init']
  if (recursive) args.push('--recursive')
  if (paths && paths.length > 0) return withPaths(args, paths)
  return args
}

export interface SubmoduleUpdateParams {
  paths?: readonly string[]
  init?: boolean
  recursive?: boolean
  remote?: boolean
  merge?: boolean
  rebase?: boolean
}

export function buildSubmoduleUpdateArgs(params: SubmoduleUpdateParams): string[] {
  const args = ['submodule', 'update']
  if (params.init) args.push('--init')
  if (params.recursive) args.push('--recursive')
  if (params.remote) args.push('--remote')
  if (params.merge) args.push('--merge')
  if (params.rebase) args.push('--rebase')
  if (params.paths && params.paths.length > 0) {
    return withFileProtocolAllow(withPaths(args, params.paths))
  }
  return withFileProtocolAllow(args)
}

export interface SubmoduleSyncParams {
  paths?: readonly string[]
  recursive?: boolean
}

export function buildSubmoduleSyncArgs({ paths, recursive }: SubmoduleSyncParams): string[] {
  const args = ['submodule', 'sync']
  if (recursive) args.push('--recursive')
  if (paths && paths.length > 0) return withPaths(args, paths)
  return args
}

export interface SubmoduleDeinitParams {
  path: string
  force?: boolean
}

export function buildSubmoduleDeinitArgs({ path, force }: SubmoduleDeinitParams): string[] {
  const args = ['submodule', 'deinit']
  if (force) args.push('--force')
  return withPaths(args, [path])
}

export interface SubmoduleSetUrlParams {
  path: string
  url: string
}

export function buildSubmoduleSetUrlArgs({ path, url }: SubmoduleSetUrlParams): string[] {
  return ['submodule', 'set-url', '--', path, url]
}

export function buildGitmodulesConfigArgs(): string[] {
  return ['config', '--file', '.gitmodules', '--list']
}

export const submoduleStatus = defineCommand({
  id: 'submodule.status',
  subcommand: 'submodule',
  buildArgs: () => buildSubmoduleStatusArgs()
})

export const submoduleAdd = defineCommand({
  id: 'submodule.add',
  subcommand: 'submodule',
  buildArgs: buildSubmoduleAddArgs,
  config: [['protocol.file.allow', 'always']]
})

export const submoduleUpdate = defineCommand({
  id: 'submodule.update',
  subcommand: 'submodule',
  buildArgs: buildSubmoduleUpdateArgs,
  config: [['protocol.file.allow', 'always']]
})
