import { defineCommand } from './_types'
import { commitRef, localBranchRef, parentRef } from './_common'

export interface RevParseVerifyParams {
  ref: string
}

export function buildRevParseVerifyArgs({ ref }: RevParseVerifyParams): string[] {
  return ['rev-parse', '--verify', ref]
}

export function buildRevParseHeadArgs(): string[] {
  return ['rev-parse', 'HEAD']
}

export function buildRevParseAbbrevRefArgs(ref: string): string[] {
  return ['rev-parse', '--abbrev-ref', ref]
}

export function buildRevParseUpstreamArgs(branch: string): string[] {
  return buildRevParseAbbrevRefArgs(`${branch}@{upstream}`)
}

export function buildRevParseShowToplevelArgs(): string[] {
  return ['rev-parse', '--show-toplevel']
}

export function buildRevParseAbsoluteGitDirArgs(): string[] {
  return ['rev-parse', '--absolute-git-dir']
}

export function buildRevParseGitCommonDirArgs(): string[] {
  return ['rev-parse', '--git-common-dir']
}

export function buildRevParseShortArgs(ref: string): string[] {
  return ['rev-parse', '--short', ref]
}

export function buildRevParseLocalBranchArgs(name: string): string[] {
  return buildRevParseVerifyArgs({ ref: localBranchRef(name) })
}

export function buildRevParseCommitArgs(name: string): string[] {
  return buildRevParseVerifyArgs({ ref: commitRef(name) })
}

export function buildRevParseParentArgs(ref: string): string[] {
  return buildRevParseVerifyArgs({ ref: parentRef(ref) })
}

export function buildRevParseHeadParentArgs(): string[] {
  return buildRevParseVerifyArgs({ ref: 'HEAD~1' })
}

export const revParseVerify = defineCommand({
  id: 'rev-parse.verify',
  subcommand: 'rev-parse',
  buildArgs: buildRevParseVerifyArgs
})

export const revParseHead = defineCommand({
  id: 'rev-parse.head',
  subcommand: 'rev-parse',
  buildArgs: () => buildRevParseHeadArgs()
})

export const revParseAbbrevRef = defineCommand({
  id: 'rev-parse.abbrev-ref',
  subcommand: 'rev-parse',
  buildArgs: (ref: string) => buildRevParseAbbrevRefArgs(ref)
})

export const revParseUpstream = defineCommand({
  id: 'rev-parse.upstream',
  subcommand: 'rev-parse',
  buildArgs: (branch: string) => buildRevParseUpstreamArgs(branch)
})

export const revParseShowToplevel = defineCommand({
  id: 'rev-parse.show-toplevel',
  subcommand: 'rev-parse',
  buildArgs: () => buildRevParseShowToplevelArgs()
})

export const revParseAbsoluteGitDir = defineCommand({
  id: 'rev-parse.absolute-git-dir',
  subcommand: 'rev-parse',
  buildArgs: () => buildRevParseAbsoluteGitDirArgs()
})

export const revParseGitCommonDir = defineCommand({
  id: 'rev-parse.git-common-dir',
  subcommand: 'rev-parse',
  buildArgs: () => buildRevParseGitCommonDirArgs()
})

export const revParseShort = defineCommand({
  id: 'rev-parse.short',
  subcommand: 'rev-parse',
  buildArgs: (ref: string) => buildRevParseShortArgs(ref)
})

export const revParseLocalBranch = defineCommand({
  id: 'rev-parse.local-branch',
  subcommand: 'rev-parse',
  buildArgs: (name: string) => buildRevParseLocalBranchArgs(name)
})

export const revParseCommit = defineCommand({
  id: 'rev-parse.commit',
  subcommand: 'rev-parse',
  buildArgs: (name: string) => buildRevParseCommitArgs(name)
})

export const revParseParent = defineCommand({
  id: 'rev-parse.parent',
  subcommand: 'rev-parse',
  buildArgs: (ref: string) => buildRevParseParentArgs(ref),
  acceptExitCodes: [0, 1]
})

export const revParseHeadParent = defineCommand({
  id: 'rev-parse.head-parent',
  subcommand: 'rev-parse',
  buildArgs: () => buildRevParseHeadParentArgs(),
  acceptExitCodes: [0, 1]
})

export const revParseCommitObject = defineCommand({
  id: 'rev-parse.commit-object',
  subcommand: 'rev-parse',
  buildArgs: (ref: string) => buildRevParseVerifyArgs({ ref: `${ref}^{commit}` })
})
