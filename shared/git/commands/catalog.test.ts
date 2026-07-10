import { describe, expect, it } from 'vitest'
import { allGitCommandIds, GIT_COMMAND_REGISTRY } from './registry'
import {
  buildAddArgs,
  buildCheckoutDiscardArgs,
  buildResetHeadArgs,
  buildResetModeArgs,
  buildRestoreDiscardArgs,
  buildDiffCommitRangeArgs,
  buildDiffCommitsArgs,
  buildDiffNoIndexArgs,
  buildDiffStagedArgs,
  buildDiffWorkingArgs
} from './working-tree'
import {
  buildBranchCreateArgs,
  buildBranchDeleteArgs,
  buildBranchListArgs,
  buildBranchRenameArgs,
  buildBranchSetUpstreamArgs,
  buildBranchUnsetUpstreamArgs
} from './branch'
import {
  buildFetchArgs,
  buildPullArgs,
  buildPushArgs,
  buildPushDeleteBranchArgs,
  buildPushDeleteTagArgs,
  buildPushTagArgs,
  buildRemoteAddArgs,
  buildRemoteListArgs,
  buildRemoteGetUrlArgs,
  buildRemoteRemoveArgs,
  buildRemoteRenameArgs,
  buildRemoteSetUrlArgs
} from './remote'
import {
  buildRevParseAbbrevRefArgs,
  buildRevParseCommitArgs,
  buildRevParseHeadArgs,
  buildRevParseLocalBranchArgs,
  buildRevParseParentArgs,
  buildRevParseShowToplevelArgs,
  buildRevParseVerifyArgs
} from './rev-parse'
import {
  buildRevListAheadBehindArgs,
  buildRevListCountNotHeadArgs,
  buildRevListParentsArgs,
  buildRevListUpstreamAheadBehindArgs
} from './rev-list'
import {
  buildCherryPickArgs,
  buildMergeAbortArgs,
  buildMergeBaseIsAncestorArgs,
  buildMergeContinueArgs,
  buildMergeStartArgs,
  buildRebaseAbortArgs,
  buildRebaseContinueArgs,
  buildRebaseSkipArgs,
  buildRebaseStartArgs,
  buildRevertArgs
} from './merge-rebase'
import {
  buildLogFileArgs,
  buildLogGraphArgs,
  buildLogMessageArgs,
  buildLogPickaxeArgs,
  buildLogSearchArgs,
  buildLogShowArgs,
  buildLogTreeArgs,
  buildShowCommitNameStatusArgs
} from './log'
import {
  buildStashApplyArgs,
  buildStashBranchArgs,
  buildStashDropArgs,
  buildStashFilesArgs,
  buildStashListArgs,
  buildStashPopArgs,
  buildStashPushArgs,
  buildStashShowArgs
} from './stash'
import {
  buildTagCreateArgs,
  buildTagDeleteArgs,
  buildTagListArgs,
  buildTagRenameArgs
} from './tag'
import {
  buildWorktreeAddArgs,
  buildWorktreeListArgs,
  buildWorktreePruneArgs,
  buildWorktreeRemoveArgs
} from './worktree'
import {
  buildGitmodulesConfigArgs,
  buildSubmoduleAddArgs,
  buildSubmoduleDeinitArgs,
  buildSubmoduleInitArgs,
  buildSubmoduleSetUrlArgs,
  buildSubmoduleStatusArgs,
  buildSubmoduleSyncArgs,
  buildSubmoduleUpdateArgs
} from './submodule'
import {
  buildApplyPatchArgs,
  buildBisectBadArgs,
  buildBisectGoodArgs,
  buildBisectLogArgs,
  buildBisectResetArgs,
  buildBisectStartArgs,
  buildBlameArgs,
  buildCleanArgs,
  buildCloneArgs,
  buildCommitArgs,
  buildConfigGetArgs,
  buildConfigListArgs,
  buildConfigSetArgs,
  buildForEachRefAllRefsArgs,
  buildFsckUnreachableArgs,
  buildGcPruneArgs,
  buildInitArgs,
  buildLsFilesArgs,
  buildLsFilesErrorUnmatchArgs,
  buildLsFilesMatchArgs,
  buildLsFilesOthersArgs,
  buildLsFilesTrackedPrefixArgs,
  buildMvArgs,
  buildNotesAddArgs,
  buildNotesListArgs,
  buildNotesShowArgs,
  buildReflogExpireArgs,
  buildReflogListArgs,
  buildReflogShowHeadArgs,
  buildRmArgs,
  buildShowBlobArgs,
  buildShowCommitSummaryArgs,
  buildShowStageArgs,
  buildSymbolicRefHeadArgs,
  buildUpdateRefDeleteArgs
} from './misc'
import { buildStatusPorcelainArgs } from './status'
import { buildSwitchCheckoutArgs, buildSwitchCreateTrackingArgs } from './switch'

describe('GIT_COMMAND_REGISTRY', () => {
  it('contains descriptors for every cataloged command', () => {
    expect(GIT_COMMAND_REGISTRY.size).toBeGreaterThan(50)
    for (const id of allGitCommandIds()) {
      const descriptor = GIT_COMMAND_REGISTRY.get(id)
      expect(descriptor, id).toBeDefined()
      expect(descriptor!.id).toBe(id)
      expect(descriptor!.subcommand.length).toBeGreaterThan(0)
    }
  })

  it('buildArgs returns non-empty argv for exemplar commands', () => {
    expect(gitCommands.revParse.revParseVerify.buildArgs({ ref: 'HEAD' })).toEqual([
      'rev-parse',
      '--verify',
      'HEAD'
    ])
    expect(gitCommands.switch.switchCheckout.buildArgs({ name: 'main', detach: false })[0]).toBe(
      'switch'
    )
    expect(gitCommands.status.statusPorcelain.buildArgs(undefined as never).length).toBeGreaterThan(
      0
    )
  })

  it('every registered descriptor buildArgs is callable', () => {
    const v = undefined as never
    const samples: Record<string, unknown> = {
      'rev-parse.verify': { ref: 'HEAD' },
      'rev-parse.head': v,
      'rev-parse.abbrev-ref': 'HEAD',
      'rev-parse.upstream': 'main',
      'rev-parse.show-toplevel': v,
      'rev-parse.absolute-git-dir': v,
      'rev-parse.git-common-dir': v,
      'rev-parse.short': 'HEAD',
      'rev-parse.local-branch': 'main',
      'rev-parse.commit': 'v1',
      'rev-parse.parent': 'abc',
      'rev-parse.head-parent': v,
      'rev-parse.commit-object': 'abc',
      'rev-list.ahead-behind': { upstream: 'origin/main', branch: 'main' },
      'rev-list.upstream-ahead-behind': v,
      'rev-list.parents': { hash: 'abc' },
      'rev-list.count-not-head': v,
      'rev-list.count-not-head-from-ref': { ref: 'refs/heads/old' },
      'switch.checkout': { name: 'main', detach: false },
      'switch.create-tracking': { local: 'feat', trackingRef: 'origin/feat' },
      'status.porcelain': v,
      'diff.conflict-names': v,
      'log.graph': 100,
      'log.message': { hash: 'abc' },
      'log.tree': { hash: 'abc' },
      'log.show': { ref: 'abc' },
      'log.file': { maxCount: 10, path: 'f' },
      'log.pickaxe': { maxCount: 10, query: 'x', mode: 'pickaxe' },
      'log.search': { maxCount: 10 },
      'branch.list': v,
      'branch.create': { name: 'feat' },
      'branch.delete': { name: 'feat', force: false },
      'branch.rename': { oldName: 'a', newName: 'b' },
      'branch.set-upstream': { branch: 'main', upstream: 'origin/main' },
      'branch.unset-upstream': 'main',
      'branch.show-current': v,
      add: { paths: ['a.ts'] },
      'reset.head-paths': { paths: ['a.ts'] },
      'reset.mode': { mode: 'soft' },
      'reset.head-parent': 'mixed',
      'restore.discard': { paths: ['a.ts'], staged: false },
      'checkout.discard': { paths: ['a.ts'], staged: false },
      'diff.working': { path: 'a.ts' },
      'diff.staged': { path: 'a.ts' },
      'diff.commits': { from: 'a', to: 'b' },
      'diff.commit-range': { oldest: 'a', newest: 'b', hasParent: true },
      'diff.no-index': { path: 'a.ts' },
      'remote.list': v,
      'remote.add': { name: 'origin', url: 'https://example.com' },
      fetch: { remote: 'origin' },
      push: { remote: 'origin', branch: 'main' },
      pull: { remote: 'origin' },
      'merge.start': { branch: 'feature' },
      'merge.abort': v,
      'merge.continue': v,
      'rebase.start': { onto: 'main' },
      'rebase.abort': v,
      'rebase.continue': v,
      'rebase.skip': v,
      'cherry-pick': { hash: 'abc' },
      'cherry-pick.continue': v,
      'cherry-pick.abort': v,
      'cherry-pick.skip': v,
      revert: { hash: 'abc' },
      'merge-base.is-ancestor': { ancestor: 'a', descendant: 'b' },
      'stash.list': v,
      'stash.push': { message: 'wip' },
      'stash.pop': 0,
      'tag.list': v,
      'tag.create': { name: 'v1' },
      'tag.delete': 'v1',
      'tag.rename': { oldName: 'v1', newName: 'v2' },
      'worktree.list': v,
      'worktree.add': { path: '/tmp/wt' },
      'worktree.remove': { path: '/tmp/wt' },
      'worktree.prune': v,
      'submodule.status': v,
      'submodule.add': { url: 'u', path: 'p' },
      'submodule.update': { init: true },
      'maintenance.fsck-unreachable': v,
      'bisect.log': v,
      'apply.patch': { patch: 'diff' },
      clone: { url: 'u', targetPath: '/tmp/r' },
      init: v
    }

    for (const [id, descriptor] of GIT_COMMAND_REGISTRY.entries()) {
      const sample = samples[id] ?? v
      const args = descriptor.buildArgs(sample as never)
      expect(args.length, id).toBeGreaterThan(0)
    }
  })
})

import { gitCommands } from './registry'

describe('command argv builders', () => {
  it('builds branch and switch args', () => {
    expect(buildBranchListArgs()).toContain('branch')
    expect(buildBranchCreateArgs({ name: 'feature' })).toContain('--end-of-options')
    expect(buildBranchDeleteArgs({ name: 'old', force: true })).toContain('-D')
    expect(buildBranchRenameArgs({ oldName: 'a', newName: 'b' })).toContain('-m')
    expect(buildBranchSetUpstreamArgs({ branch: 'main', upstream: 'origin/main' })).toContain(
      '--set-upstream-to'
    )
    expect(buildBranchUnsetUpstreamArgs('main')).toContain('--unset-upstream')
    expect(buildSwitchCheckoutArgs({ name: 'main', detach: true })).toContain('--detach')
    expect(buildSwitchCreateTrackingArgs({ local: 'feat', trackingRef: 'origin/feat' })).toContain(
      '--track'
    )
  })

  it('builds rev-parse and rev-list args', () => {
    expect(buildRevParseVerifyArgs({ ref: 'HEAD' })).toEqual(['rev-parse', '--verify', 'HEAD'])
    expect(buildRevParseHeadArgs()).toEqual(['rev-parse', 'HEAD'])
    expect(buildRevParseAbbrevRefArgs('main')).toContain('main')
    expect(buildRevParseLocalBranchArgs('main')).toContain('refs/heads/main')
    expect(buildRevParseCommitArgs('v1').join(' ')).toContain('^{commit}')
    expect(buildRevParseParentArgs('abc').join(' ')).toContain('abc^')
    expect(buildRevParseShowToplevelArgs()).toContain('--show-toplevel')
    expect(buildRevListAheadBehindArgs({ upstream: 'a', branch: 'b' })).toContain('--left-right')
    expect(buildRevListUpstreamAheadBehindArgs().join(' ')).toContain('@{upstream}')
    expect(buildRevListParentsArgs({ hash: 'abc' })).toContain('--parents')
    expect(buildRevListCountNotHeadArgs()).toContain('--not')
  })

  it('builds working tree args', () => {
    expect(buildStatusPorcelainArgs()).toContain('--porcelain=2')
    expect(buildAddArgs({ paths: ['a.ts'] })).toEqual(['add', '--', 'a.ts'])
    expect(buildResetHeadArgs({ paths: ['a.ts'] })).toContain('HEAD')
    expect(buildResetModeArgs({ mode: 'hard', ref: 'HEAD~1' })).toContain('--hard')
    expect(buildRestoreDiscardArgs({ paths: ['a.ts'], staged: false })).toContain('restore')
    expect(buildCheckoutDiscardArgs({ paths: ['a.ts'], staged: true })).toContain('checkout')
    expect(buildCleanArgs({ dryRun: true })).toContain('-fdn')
    expect(buildCommitArgs({ message: 'msg', amend: true })).toContain('--amend')
    expect(buildRmArgs({ paths: ['a.ts'], force: true })).toContain('-f')
    expect(buildDiffWorkingArgs({ path: 'a.ts', wordDiff: true })).toContain('--word-diff=plain')
    expect(buildDiffStagedArgs({ path: 'a.ts' })).toContain('--cached')
    expect(buildDiffCommitsArgs({ from: 'a', to: 'b', path: 'f' })).toContain('a')
    expect(buildDiffCommitsArgs({ from: 'a', to: 'b', path: 'f', mergeBase: true })).toEqual([
      'diff',
      'a...b',
      '--',
      'f'
    ])
    expect(
      buildDiffCommitsArgs({ from: 'a', to: 'b', paths: ['f.ts', 'g.ts'], mergeBase: true })
    ).toEqual(['diff', 'a...b', '--', 'f.ts', 'g.ts'])
    expect(buildDiffCommitRangeArgs({ oldest: 'a', newest: 'b', hasParent: true })).toContain('a^')
    expect(buildDiffNoIndexArgs({ path: 'new.ts' })).toContain('--no-index')
  })

  it('builds remote args', () => {
    expect(buildRemoteListArgs()).toEqual(['remote', '-v'])
    expect(buildRemoteGetUrlArgs('origin')).toEqual(['remote', 'get-url', 'origin'])
    expect(buildRemoteAddArgs({ name: 'origin', url: 'https://example.com' })).toContain('add')
    expect(buildRemoteRemoveArgs('origin')).toContain('remove')
    expect(buildRemoteRenameArgs({ oldName: 'a', newName: 'b' })).toContain('rename')
    expect(buildRemoteSetUrlArgs({ name: 'origin', url: 'u', push: true })).toContain('--push')
    expect(buildFetchArgs({ remote: 'origin', tags: true })).toContain('--prune')
    expect(buildPushArgs({ remote: 'origin', branch: 'main', setUpstream: true })).toContain('-u')
    expect(buildPullArgs({ remote: 'origin', rebase: true })).toContain('--rebase')
    expect(buildPushDeleteBranchArgs({ remote: 'origin', branch: 'old' }).join(' ')).toContain(
      ':refs/heads/'
    )
    expect(buildPushTagArgs({ remote: 'origin', allTags: true })).toContain('--tags')
    expect(buildPushDeleteTagArgs({ remote: 'origin', tag: 'v1' }).join(' ')).toContain(
      ':refs/tags/'
    )
  })

  it('builds log, stash, tag, worktree, submodule, merge/rebase, and misc args', () => {
    expect(buildLogGraphArgs(100)[0]).toBe('log')
    expect(buildLogMessageArgs({ hash: 'abc' }).some((arg) => arg.includes('%B'))).toBe(true)
    expect(buildLogTreeArgs({ hash: 'abc' })).toEqual(['ls-tree', '-r', '--name-only', 'abc'])
    expect(buildShowCommitNameStatusArgs('abc')).toContain('--name-status')
    expect(buildLogShowArgs({ ref: 'abc', path: 'f' })).toContain('show')
    expect(buildLogFileArgs({ maxCount: 10, path: 'f' })).toContain('--follow')
    expect(buildLogPickaxeArgs({ maxCount: 10, query: 'x', mode: 'pickaxe' })).toContain('-S')
    expect(buildLogSearchArgs({ maxCount: 10, author: 'alice' })).toContain('--author=alice')

    expect(buildStashListArgs()).toContain('stash')
    expect(buildStashPushArgs({ message: 'wip' })).toContain('-m')
    expect(buildStashPopArgs(0)).toContain('stash@{0}')
    expect(buildStashApplyArgs(1)).toContain('stash@{1}')
    expect(buildStashDropArgs(2)).toContain('stash@{2}')
    expect(buildStashBranchArgs('branch', 0)).toContain('branch')
    expect(buildStashShowArgs({ index: 0, path: 'f' })).toContain('-p')
    expect(buildStashFilesArgs(0)).toContain('--name-status')

    expect(buildTagListArgs()).toContain('for-each-ref')
    expect(buildTagCreateArgs({ name: 'v1', message: 'release' })).toContain('-a')
    expect(buildTagDeleteArgs('v1')).toContain('-d')
    expect(buildTagRenameArgs({ oldName: 'v1', newName: 'v2' })).toContain('v1')

    expect(buildWorktreeListArgs()).toContain('--porcelain')
    expect(buildWorktreeAddArgs({ path: '/tmp/wt', newBranch: 'feat' })).toContain('-b')
    expect(buildWorktreeRemoveArgs({ path: '/tmp/wt', force: true })).toContain('--force')
    expect(buildWorktreePruneArgs()).toContain('prune')

    expect(buildSubmoduleStatusArgs()).toContain('--recursive')
    expect(buildSubmoduleAddArgs({ url: 'u', path: 'p' })).toContain('add')
    expect(buildSubmoduleInitArgs({ paths: ['p'], recursive: true })).toContain('--recursive')
    expect(buildSubmoduleUpdateArgs({ init: true, remote: true })).toContain('--remote')
    expect(buildSubmoduleSyncArgs({ paths: ['p'] })).toContain('sync')
    expect(buildSubmoduleDeinitArgs({ path: 'p', force: true })).toContain('--force')
    expect(buildSubmoduleSetUrlArgs({ path: 'p', url: 'u' })).toContain('set-url')
    expect(buildGitmodulesConfigArgs()).toContain('.gitmodules')

    expect(buildMergeStartArgs({ branch: 'feature', noFf: true })).toContain('--no-ff')
    expect(buildMergeAbortArgs()).toContain('--abort')
    expect(buildMergeContinueArgs()).toContain('--continue')
    expect(buildRebaseStartArgs({ onto: 'main', from: 'topic' })).toContain('--onto')
    expect(buildRebaseAbortArgs()).toContain('--abort')
    expect(buildRebaseContinueArgs()).toContain('--continue')
    expect(buildRebaseSkipArgs()).toContain('--skip')
    expect(buildCherryPickArgs({ hash: 'abc', noCommit: true })).toContain('-n')
    expect(buildRevertArgs({ hash: 'abc', mainline: 1 })).toContain('-m')
    expect(buildMergeBaseIsAncestorArgs({ ancestor: 'a', descendant: 'b' })).toContain(
      '--is-ancestor'
    )

    expect(buildFsckUnreachableArgs()).toContain('fsck')
    expect(buildForEachRefAllRefsArgs()).toContain('for-each-ref')
    expect(buildShowCommitSummaryArgs('abc')).toContain('show')
    expect(buildLsFilesTrackedPrefixArgs('dir/')).toContain('ls-files')
    expect(buildLsFilesErrorUnmatchArgs('f')).toContain('--error-unmatch')
    expect(buildReflogShowHeadArgs(2, '%H')).toContain('reflog')
    expect(buildReflogExpireArgs()).toContain('expire')
    expect(buildGcPruneArgs()).toContain('gc')
    expect(buildSymbolicRefHeadArgs()).toContain('symbolic-ref')
    expect(buildUpdateRefDeleteArgs('refs/heads/old')).toContain('-d')
    expect(buildReflogListArgs({ maxCount: 50 })).toContain('reflog')
    expect(buildBisectStartArgs({ badRef: 'HEAD', goodRef: 'main' })).toContain('start')
    expect(buildBisectGoodArgs('HEAD')).toContain('good')
    expect(buildBisectBadArgs('HEAD')).toContain('bad')
    expect(buildBisectResetArgs()).toContain('reset')
    expect(buildBisectLogArgs()).toContain('log')
    expect(buildNotesListArgs()).toContain('notes')
    expect(buildNotesShowArgs('abc')).toContain('show')
    expect(buildNotesAddArgs({ hash: 'abc', message: 'note', force: true })).toContain('-f')
    expect(buildConfigGetArgs({ key: 'user.name', scope: 'local' })).toContain('config')
    expect(buildConfigSetArgs({ key: 'k', value: 'v', scope: 'global' })).toContain('--global')
    expect(buildConfigListArgs('local')).toContain('--list')
    expect(buildBlameArgs({ path: 'f.ts', ref: 'HEAD' })).toContain('blame')
    expect(buildShowBlobArgs({ ref: 'HEAD', path: 'f' })).toContain('show')
    expect(buildShowStageArgs({ stage: 2, path: 'f' })).toContain(':2:f')
    expect(buildApplyPatchArgs({ patch: 'diff', reverse: true })).toContain('--reverse')
    expect(buildCloneArgs({ url: 'u', targetPath: '/tmp/r' })).toContain('clone')
    expect(buildInitArgs()).toEqual(['init'])
    expect(buildLsFilesOthersArgs('f')).toContain('--others')
    expect(buildLsFilesArgs()).toContain('-s')
    expect(buildLsFilesMatchArgs({ path: 'f' })).toContain('-s')
    expect(buildMvArgs({ oldPath: 'a', newPath: 'b' })).toContain('mv')
    expect(buildStatusPorcelainArgs()).toContain('status')
  })
})
