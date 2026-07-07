import type { GitCommandDescriptor } from './_types'
import * as revParse from './rev-parse'
import * as revList from './rev-list'
import * as switchCmd from './switch'
import * as statusCmd from './status'
import * as logCmd from './log'
import * as branchCmd from './branch'
import * as workingTree from './working-tree'
import * as remoteCmd from './remote'
import * as mergeRebase from './merge-rebase'
import * as stashCmd from './stash'
import * as tagCmd from './tag'
import * as worktreeCmd from './worktree'
import * as submoduleCmd from './submodule'
import * as misc from './misc'

/** Flat registry of every git command descriptor by stable ID. */
export const GIT_COMMAND_REGISTRY: Map<string, GitCommandDescriptor<unknown>> = new Map([
  [revParse.revParseVerify.id, revParse.revParseVerify],
  [revParse.revParseHead.id, revParse.revParseHead],
  [revParse.revParseAbbrevRef.id, revParse.revParseAbbrevRef],
  [revParse.revParseUpstream.id, revParse.revParseUpstream],
  [revParse.revParseShowToplevel.id, revParse.revParseShowToplevel],
  [revParse.revParseAbsoluteGitDir.id, revParse.revParseAbsoluteGitDir],
  [revParse.revParseGitCommonDir.id, revParse.revParseGitCommonDir],
  [revParse.revParseShort.id, revParse.revParseShort],
  [revParse.revParseLocalBranch.id, revParse.revParseLocalBranch],
  [revParse.revParseCommit.id, revParse.revParseCommit],
  [revParse.revParseParent.id, revParse.revParseParent],
  [revParse.revParseHeadParent.id, revParse.revParseHeadParent],
  [revParse.revParseCommitObject.id, revParse.revParseCommitObject],
  [revList.revListAheadBehind.id, revList.revListAheadBehind],
  [revList.revListUpstreamAheadBehind.id, revList.revListUpstreamAheadBehind],
  [revList.revListParents.id, revList.revListParents],
  [revList.revListCountNotHead.id, revList.revListCountNotHead],
  [revList.revListCountNotHeadFromRef.id, revList.revListCountNotHeadFromRef],
  [switchCmd.switchCheckout.id, switchCmd.switchCheckout],
  [switchCmd.switchCreateTracking.id, switchCmd.switchCreateTracking],
  [statusCmd.statusPorcelain.id, statusCmd.statusPorcelain],
  [statusCmd.diffConflictNames.id, statusCmd.diffConflictNames],
  [logCmd.logGraph.id, logCmd.logGraph],
  [logCmd.logMessage.id, logCmd.logMessage],
  [logCmd.logShow.id, logCmd.logShow],
  [logCmd.logFile.id, logCmd.logFile],
  [logCmd.logPickaxe.id, logCmd.logPickaxe],
  [logCmd.logSearch.id, logCmd.logSearch],
  [branchCmd.branchList.id, branchCmd.branchList],
  [branchCmd.branchCreate.id, branchCmd.branchCreate],
  [branchCmd.branchDelete.id, branchCmd.branchDelete],
  [branchCmd.branchRename.id, branchCmd.branchRename],
  [branchCmd.branchSetUpstream.id, branchCmd.branchSetUpstream],
  [branchCmd.branchUnsetUpstream.id, branchCmd.branchUnsetUpstream],
  [branchCmd.branchShowCurrent.id, branchCmd.branchShowCurrent],
  [workingTree.add.id, workingTree.add],
  [workingTree.resetHead.id, workingTree.resetHead],
  [workingTree.resetMode.id, workingTree.resetMode],
  [workingTree.resetHeadParent.id, workingTree.resetHeadParent],
  [workingTree.restoreDiscard.id, workingTree.restoreDiscard],
  [workingTree.checkoutDiscard.id, workingTree.checkoutDiscard],
  [workingTree.diffWorking.id, workingTree.diffWorking],
  [workingTree.diffStaged.id, workingTree.diffStaged],
  [workingTree.diffCommits.id, workingTree.diffCommits],
  [workingTree.diffCommitRange.id, workingTree.diffCommitRange],
  [workingTree.diffNoIndex.id, workingTree.diffNoIndex],
  [remoteCmd.remoteList.id, remoteCmd.remoteList],
  [remoteCmd.remoteGetUrl.id, remoteCmd.remoteGetUrl],
  [remoteCmd.remoteAdd.id, remoteCmd.remoteAdd],
  [remoteCmd.fetch.id, remoteCmd.fetch],
  [remoteCmd.push.id, remoteCmd.push],
  [remoteCmd.pull.id, remoteCmd.pull],
  [mergeRebase.mergeStart.id, mergeRebase.mergeStart],
  [mergeRebase.mergeAbort.id, mergeRebase.mergeAbort],
  [mergeRebase.mergeContinue.id, mergeRebase.mergeContinue],
  [mergeRebase.rebaseStart.id, mergeRebase.rebaseStart],
  [mergeRebase.rebaseAbort.id, mergeRebase.rebaseAbort],
  [mergeRebase.rebaseContinue.id, mergeRebase.rebaseContinue],
  [mergeRebase.rebaseSkip.id, mergeRebase.rebaseSkip],
  [mergeRebase.cherryPick.id, mergeRebase.cherryPick],
  [mergeRebase.cherryPickContinue.id, mergeRebase.cherryPickContinue],
  [mergeRebase.cherryPickAbort.id, mergeRebase.cherryPickAbort],
  [mergeRebase.cherryPickSkip.id, mergeRebase.cherryPickSkip],
  [mergeRebase.revert.id, mergeRebase.revert],
  [mergeRebase.mergeBaseIsAncestor.id, mergeRebase.mergeBaseIsAncestor],
  [stashCmd.stashList.id, stashCmd.stashList],
  [stashCmd.stashPush.id, stashCmd.stashPush],
  [stashCmd.stashPop.id, stashCmd.stashPop],
  [tagCmd.tagList.id, tagCmd.tagList],
  [tagCmd.tagCreate.id, tagCmd.tagCreate],
  [tagCmd.tagDelete.id, tagCmd.tagDelete],
  [tagCmd.tagRename.id, tagCmd.tagRename],
  [worktreeCmd.worktreeList.id, worktreeCmd.worktreeList],
  [worktreeCmd.worktreeAdd.id, worktreeCmd.worktreeAdd],
  [worktreeCmd.worktreeRemove.id, worktreeCmd.worktreeRemove],
  [worktreeCmd.worktreePrune.id, worktreeCmd.worktreePrune],
  [submoduleCmd.submoduleStatus.id, submoduleCmd.submoduleStatus],
  [submoduleCmd.submoduleAdd.id, submoduleCmd.submoduleAdd],
  [submoduleCmd.submoduleUpdate.id, submoduleCmd.submoduleUpdate],
  [misc.fsckUnreachable.id, misc.fsckUnreachable],
  [misc.bisectLog.id, misc.bisectLog],
  [misc.applyPatch.id, misc.applyPatch],
  [misc.clone.id, misc.clone],
  [misc.init.id, misc.init]
] as [string, GitCommandDescriptor<unknown>][])

/** Grouped command descriptors for discoverability in operations code. */
export const gitCommands = {
  revParse,
  revList,
  switch: switchCmd,
  status: statusCmd,
  log: logCmd,
  branch: branchCmd,
  workingTree,
  remote: remoteCmd,
  mergeRebase,
  stash: stashCmd,
  tag: tagCmd,
  worktree: worktreeCmd,
  submodule: submoduleCmd,
  misc
} as const

export function getGitCommand(id: string): GitCommandDescriptor<unknown> | undefined {
  return GIT_COMMAND_REGISTRY.get(id)
}

export function allGitCommandIds(): string[] {
  return [...GIT_COMMAND_REGISTRY.keys()].sort()
}
