import { defineCommand } from './_types'
import { aheadBehindArgs, upstreamAheadBehindArgs } from './_common'

export interface RevListAheadBehindParams {
  upstream: string
  branch: string
}

export function buildRevListAheadBehindArgs(params: RevListAheadBehindParams): string[] {
  return [...aheadBehindArgs(params.upstream, params.branch)]
}

export function buildRevListUpstreamAheadBehindArgs(): string[] {
  return [...upstreamAheadBehindArgs()]
}

export interface RevListParentsParams {
  hash: string
  count?: number
}

export function buildRevListParentsArgs({ hash, count = 1 }: RevListParentsParams): string[] {
  return ['rev-list', '--parents', '-n', String(count), hash]
}

export function buildRevListCountNotHeadArgs(): string[] {
  return ['rev-list', '--count', '--all', '--not', 'HEAD']
}

export interface RevListCountNotHeadFromRefParams {
  ref: string
}

export function buildRevListCountNotHeadFromRefArgs({ ref }: RevListCountNotHeadFromRefParams): string[] {
  return ['rev-list', '--count', ref, '--not', 'HEAD']
}

export const revListAheadBehind = defineCommand({
  id: 'rev-list.ahead-behind',
  subcommand: 'rev-list',
  buildArgs: buildRevListAheadBehindArgs
})

export const revListUpstreamAheadBehind = defineCommand({
  id: 'rev-list.upstream-ahead-behind',
  subcommand: 'rev-list',
  buildArgs: () => buildRevListUpstreamAheadBehindArgs()
})

export const revListParents = defineCommand({
  id: 'rev-list.parents',
  subcommand: 'rev-list',
  buildArgs: buildRevListParentsArgs
})

export const revListCountNotHead = defineCommand({
  id: 'rev-list.count-not-head',
  subcommand: 'rev-list',
  buildArgs: () => buildRevListCountNotHeadArgs()
})

export const revListCountNotHeadFromRef = defineCommand({
  id: 'rev-list.count-not-head-from-ref',
  subcommand: 'rev-list',
  buildArgs: buildRevListCountNotHeadFromRefArgs
})
