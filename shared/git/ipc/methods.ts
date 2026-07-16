import type * as P from './params'
import type * as R from './results'

export type GitIpcStateSource = 'git' | 'filesystem' | 'mixed'

export interface GitIpcMethodMeta {
  invalidates: readonly string[]
  commands: readonly string[]
  settings?: readonly P.GitIpcSettingsKey[]
  crossRepo?: boolean
  stateSource?: GitIpcStateSource
}

export const GIT_IPC_METHODS = {
  'repo.status': {
    invalidates: [],
    commands: ['rev-parse.abbrev-ref', 'rev-parse.head', 'rev-parse.show-toplevel'],
    stateSource: 'git'
  },
  'log.graph': {
    invalidates: [],
    commands: ['log.graph'],
    stateSource: 'git'
  },
  'log.show': {
    invalidates: [],
    commands: ['log.show'],
    stateSource: 'git'
  },
  'log.message': {
    invalidates: [],
    commands: ['log.message'],
    stateSource: 'git'
  },
  'log.tree': {
    invalidates: [],
    commands: ['log.tree'],
    stateSource: 'git'
  },
  'log.file': {
    invalidates: [],
    commands: ['log.file'],
    stateSource: 'git'
  },
  'log.pickaxe': {
    invalidates: [],
    commands: ['log.pickaxe'],
    stateSource: 'git'
  },
  // NOTE: log.search is implemented in the backend but not yet called from the renderer.
  // The renderer currently performs commit search client-side on the loaded graph
  // (src/lib/git/commitSearch.ts). Wire this to the UI when server-side search is needed
  // (e.g. for repositories too large to load the full graph).
  'log.search': {
    invalidates: [],
    commands: ['log.search'],
    stateSource: 'git'
  },
  'branch.list': {
    invalidates: [],
    commands: ['branch.list', 'rev-parse.upstream', 'rev-list.ahead-behind'],
    stateSource: 'git'
  },
  'branch.checkout': {
    invalidates: ['branch.list', 'working.status', 'log.graph', 'repo.status'],
    commands: ['switch.checkout'],
    stateSource: 'git'
  },
  'branch.create': {
    invalidates: ['branch.list'],
    commands: ['branch.create'],
    stateSource: 'git'
  },
  'branch.delete': {
    invalidates: ['branch.list'],
    commands: ['branch.delete'],
    stateSource: 'git'
  },
  'branch.rename': {
    invalidates: ['branch.list', 'log.graph'],
    commands: ['branch.rename'],
    stateSource: 'git'
  },
  'branch.checkoutRemote': {
    invalidates: ['branch.list', 'working.status', 'log.graph', 'repo.status'],
    commands: ['switch.checkout', 'switch.create-tracking'],
    stateSource: 'git'
  },
  'branch.setUpstream': {
    invalidates: ['branch.list'],
    commands: ['branch.set-upstream'],
    stateSource: 'git'
  },
  'branch.unsetUpstream': {
    invalidates: ['branch.list'],
    commands: ['branch.unset-upstream'],
    stateSource: 'git'
  },
  'branch.deleteRemote': {
    invalidates: ['branch.list'],
    commands: ['push'],
    stateSource: 'git'
  },
  'tag.list': {
    invalidates: [],
    commands: ['tag.list'],
    stateSource: 'git'
  },
  'tag.create': {
    invalidates: ['tag.list', 'log.graph'],
    commands: ['tag.create'],
    stateSource: 'git'
  },
  'tag.delete': {
    invalidates: ['tag.list', 'log.graph'],
    commands: ['tag.delete', 'push'],
    stateSource: 'git'
  },
  'tag.push': {
    invalidates: ['tag.list'],
    commands: ['push'],
    stateSource: 'git'
  },
  'tag.rename': {
    invalidates: ['tag.list', 'log.graph'],
    commands: ['tag.rename'],
    stateSource: 'git'
  },
  'working.status': {
    invalidates: [],
    commands: ['status.porcelain', 'rev-list.upstream-ahead-behind'],
    stateSource: 'mixed'
  },
  'working.cleanPreview': {
    invalidates: [],
    commands: ['clean'],
    stateSource: 'git'
  },
  'working.read': {
    invalidates: [],
    commands: [],
    stateSource: 'filesystem',
    crossRepo: true
  },
  'working.discard': {
    invalidates: ['working.status'],
    commands: ['restore.discard', 'checkout.discard'],
    stateSource: 'git'
  },
  'working.remove': {
    invalidates: ['working.status'],
    commands: ['rm'],
    stateSource: 'git'
  },
  'working.clean': {
    invalidates: ['working.status'],
    commands: ['clean'],
    stateSource: 'git'
  },
  'working.write': {
    invalidates: ['working.status'],
    commands: [],
    stateSource: 'filesystem',
    crossRepo: true
  },
  'working.rename': {
    invalidates: ['working.status'],
    commands: ['mv'],
    stateSource: 'git'
  },
  'working.addToGitignore': {
    invalidates: ['working.status'],
    commands: [],
    stateSource: 'filesystem'
  },
  'stage.add': {
    invalidates: ['working.status'],
    commands: ['add'],
    stateSource: 'git'
  },
  'stage.reset': {
    invalidates: ['working.status'],
    commands: ['reset.head-paths'],
    stateSource: 'git'
  },
  'stage.applyPatch': {
    invalidates: ['working.status', 'diff.working', 'diff.staged'],
    commands: ['apply.patch'],
    stateSource: 'git'
  },
  'commit.create': {
    invalidates: ['working.status', 'log.graph', 'repo.status', 'branch.list'],
    commands: ['commit'],
    stateSource: 'git'
  },
  'commit.reword': {
    invalidates: ['working.status', 'log.graph', 'repo.status', 'branch.list'],
    commands: ['rebase'],
    stateSource: 'git'
  },
  'commit.revert': {
    invalidates: ['working.status', 'log.graph', 'repo.status', 'branch.list'],
    commands: ['revert'],
    stateSource: 'git'
  },
  'diff.working': {
    invalidates: [],
    commands: ['diff.working', 'diff.no-index'],
    stateSource: 'git'
  },
  'diff.staged': {
    invalidates: [],
    commands: ['diff.staged'],
    stateSource: 'git'
  },
  'diff.commits': {
    invalidates: [],
    commands: ['diff.commits'],
    stateSource: 'git'
  },
  'diff.commitRange': {
    invalidates: [],
    commands: ['diff.commit-range'],
    stateSource: 'git'
  },
  'diff.show': {
    invalidates: [],
    commands: ['log.show'],
    stateSource: 'git'
  },
  'file.read': {
    invalidates: [],
    commands: ['show'],
    stateSource: 'git'
  },
  'file.blame': {
    invalidates: [],
    commands: ['blame'],
    stateSource: 'git'
  },
  'file.readStage': {
    invalidates: [],
    commands: ['show'],
    stateSource: 'git',
    crossRepo: true
  },
  'reflog.list': {
    invalidates: [],
    commands: ['reflog'],
    stateSource: 'git'
  },
  // NOTE: undo.peek is implemented but not yet called from the renderer.
  // The renderer currently goes directly to undo.last without a preview step.
  // Wire this to show a confirmation preview before undoing the last commit.
  'undo.peek': {
    invalidates: [],
    commands: ['reflog'],
    stateSource: 'git'
  },
  'undo.last': {
    invalidates: ['working.status', 'log.graph', 'repo.status', 'branch.list'],
    commands: ['reset.mode'],
    stateSource: 'git'
  },
  // NOTE: notes.list is implemented but not yet called from the renderer.
  // Git notes are currently displayed inline via the %N log format in log.graph.
  // Wire this to a dedicated notes view when per-commit notes management is added.
  'notes.list': {
    invalidates: [],
    commands: ['notes'],
    stateSource: 'git'
  },
  'notes.add': {
    invalidates: ['log.graph'],
    commands: ['notes'],
    stateSource: 'git'
  },
  'bisect.status': {
    invalidates: [],
    commands: ['bisect.log'],
    stateSource: 'git'
  },
  'bisect.start': {
    invalidates: ['merge.status', 'working.status'],
    commands: ['bisect'],
    stateSource: 'git'
  },
  'bisect.good': {
    invalidates: ['merge.status', 'log.graph'],
    commands: ['bisect'],
    stateSource: 'git'
  },
  'bisect.bad': {
    invalidates: ['merge.status', 'log.graph'],
    commands: ['bisect'],
    stateSource: 'git'
  },
  'bisect.reset': {
    invalidates: ['merge.status', 'log.graph', 'working.status'],
    commands: ['bisect'],
    stateSource: 'git'
  },
  'config.get': {
    invalidates: [],
    commands: ['config'],
    stateSource: 'git'
  },
  'config.set': {
    invalidates: [],
    commands: ['config'],
    stateSource: 'git'
  },
  'config.list': {
    invalidates: [],
    commands: ['config'],
    stateSource: 'git'
  },
  'hooks.list': {
    invalidates: [],
    commands: [],
    stateSource: 'filesystem'
  },
  'hooks.read': {
    invalidates: [],
    commands: [],
    stateSource: 'filesystem'
  },
  'hooks.write': {
    invalidates: ['hooks.list'],
    commands: [],
    stateSource: 'filesystem'
  },
  'hooks.enable': {
    invalidates: ['hooks.list'],
    commands: [],
    stateSource: 'filesystem'
  },
  'hooks.disable': {
    invalidates: ['hooks.list'],
    commands: [],
    stateSource: 'filesystem'
  },
  'hooks.delete': {
    invalidates: ['hooks.list'],
    commands: [],
    stateSource: 'filesystem'
  },
  'remote.list': {
    invalidates: [],
    commands: ['remote.list'],
    stateSource: 'git'
  },
  'remote.add': {
    invalidates: ['remote.list'],
    commands: ['remote.add'],
    stateSource: 'git'
  },
  'remote.remove': {
    invalidates: ['remote.list', 'branch.list', 'tag.list'],
    commands: ['remote.remove'],
    stateSource: 'git'
  },
  'remote.rename': {
    invalidates: ['remote.list', 'branch.list'],
    commands: ['remote.rename'],
    stateSource: 'git'
  },
  'remote.setUrl': {
    invalidates: ['remote.list'],
    commands: ['remote.set-url'],
    stateSource: 'git'
  },
  fetch: {
    invalidates: ['branch.list', 'log.graph', 'working.status', 'tag.list'],
    commands: ['fetch'],
    settings: ['submoduleRecursion'],
    stateSource: 'git'
  },
  push: {
    invalidates: ['branch.list', 'working.status'],
    commands: ['push'],
    settings: ['pushSubmoduleRecursion'],
    stateSource: 'git'
  },
  pull: {
    invalidates: ['branch.list', 'log.graph', 'working.status'],
    commands: ['pull'],
    settings: ['submoduleRecursion', 'pullRebase'],
    stateSource: 'git'
  },
  'stash.list': {
    invalidates: [],
    commands: ['stash.list'],
    stateSource: 'git'
  },
  'stash.show': {
    invalidates: [],
    commands: ['stash.show'],
    stateSource: 'git'
  },
  'stash.files': {
    invalidates: [],
    commands: ['stash.show'],
    stateSource: 'git'
  },
  'stash.push': {
    invalidates: ['working.status', 'stash.list'],
    commands: ['stash.push'],
    stateSource: 'git'
  },
  'stash.branch': {
    invalidates: ['stash.list', 'branch.list', 'working.status'],
    commands: ['stash.branch'],
    stateSource: 'git'
  },
  'stash.pop': {
    invalidates: ['working.status', 'stash.list'],
    commands: ['stash.pop'],
    stateSource: 'git'
  },
  'stash.apply': {
    invalidates: ['working.status'],
    commands: ['stash.apply'],
    stateSource: 'git'
  },
  'stash.drop': {
    invalidates: ['stash.list'],
    commands: ['stash.drop'],
    stateSource: 'git'
  },
  'worktree.list': {
    invalidates: [],
    commands: ['worktree.list'],
    stateSource: 'git'
  },
  'worktree.add': {
    invalidates: ['worktree.list', 'branch.list'],
    commands: ['worktree.add'],
    stateSource: 'git'
  },
  'worktree.remove': {
    invalidates: ['worktree.list', 'branch.list'],
    commands: ['worktree.remove'],
    stateSource: 'git'
  },
  'worktree.prune': {
    invalidates: ['worktree.list'],
    commands: ['worktree.prune'],
    stateSource: 'git'
  },
  'submodule.list': {
    invalidates: [],
    commands: ['submodule.status', 'config'],
    stateSource: 'mixed'
  },
  'submodule.add': {
    invalidates: ['submodule.list', 'working.status'],
    commands: ['submodule.add'],
    stateSource: 'git'
  },
  'submodule.init': {
    invalidates: ['submodule.list', 'working.status'],
    commands: ['submodule.init'],
    stateSource: 'git'
  },
  'submodule.update': {
    invalidates: ['submodule.list', 'working.status'],
    commands: ['submodule.update'],
    stateSource: 'git'
  },
  'submodule.sync': {
    invalidates: ['submodule.list'],
    commands: ['submodule.sync'],
    stateSource: 'git'
  },
  'submodule.deinit': {
    invalidates: ['submodule.list', 'working.status'],
    commands: ['submodule.deinit'],
    stateSource: 'git'
  },
  'submodule.remove': {
    invalidates: ['submodule.list', 'working.status'],
    commands: ['submodule.remove'],
    stateSource: 'git'
  },
  'submodule.setUrl': {
    invalidates: ['submodule.list'],
    commands: ['submodule.set-url'],
    stateSource: 'git'
  },
  'merge.status': {
    invalidates: [],
    commands: ['diff.conflict-names', 'branch.show-current'],
    stateSource: 'mixed'
  },
  'merge.start': {
    invalidates: ['branch.list', 'working.status', 'log.graph', 'merge.status'],
    commands: ['merge.start'],
    stateSource: 'git'
  },
  'merge.into': {
    invalidates: ['branch.list', 'working.status', 'log.graph', 'merge.status'],
    commands: ['switch.checkout', 'merge.start'],
    stateSource: 'git'
  },
  'merge.squashInto': {
    invalidates: ['branch.list', 'working.status', 'log.graph', 'merge.status'],
    commands: ['switch.checkout', 'merge.start', 'commit.create'],
    stateSource: 'git'
  },
  'merge.abort': {
    invalidates: ['working.status', 'merge.status'],
    commands: ['merge.abort'],
    stateSource: 'git'
  },
  'merge.continue': {
    invalidates: ['working.status', 'log.graph', 'merge.status'],
    commands: ['merge.continue'],
    stateSource: 'git'
  },
  'rebase.start': {
    invalidates: ['branch.list', 'working.status', 'log.graph', 'merge.status'],
    commands: ['rebase.start'],
    stateSource: 'git'
  },
  'rebase.interactive': {
    invalidates: ['working.status', 'log.graph', 'repo.status', 'branch.list'],
    commands: ['rebase'],
    stateSource: 'git'
  },
  'rebase.abort': {
    invalidates: ['working.status', 'merge.status'],
    commands: ['rebase.abort'],
    stateSource: 'git'
  },
  'rebase.continue': {
    invalidates: ['working.status', 'log.graph', 'merge.status'],
    commands: ['rebase.continue'],
    stateSource: 'git'
  },
  'rebase.skip': {
    invalidates: ['working.status', 'log.graph', 'merge.status'],
    commands: ['rebase.skip'],
    stateSource: 'git'
  },
  'cherry-pick': {
    invalidates: ['working.status', 'log.graph', 'merge.status'],
    commands: ['cherry-pick'],
    stateSource: 'git'
  },
  'cherry-pick.continue': {
    invalidates: ['working.status', 'log.graph', 'merge.status'],
    commands: ['cherry-pick.continue'],
    stateSource: 'git'
  },
  'cherry-pick.abort': {
    invalidates: ['working.status', 'merge.status'],
    commands: ['cherry-pick.abort'],
    stateSource: 'git'
  },
  'cherry-pick.skip': {
    invalidates: ['working.status', 'log.graph', 'merge.status'],
    commands: ['cherry-pick.skip'],
    stateSource: 'git'
  },
  'rebase.squash': {
    invalidates: ['working.status', 'log.graph', 'repo.status'],
    commands: ['rebase'],
    stateSource: 'git'
  },
  'rebase.drop': {
    invalidates: ['working.status', 'log.graph', 'repo.status', 'branch.list'],
    commands: ['rebase'],
    stateSource: 'git'
  },
  reset: {
    invalidates: ['working.status', 'log.graph', 'repo.status'],
    commands: ['reset.mode'],
    stateSource: 'git'
  },
  'reset.head': {
    invalidates: ['working.status', 'log.graph', 'repo.status', 'branch.list'],
    commands: ['reset.head-parent'],
    stateSource: 'git'
  },
  'maintenance.unreachable': {
    invalidates: [],
    commands: ['maintenance.fsck-unreachable'],
    stateSource: 'git'
  },
  'maintenance.staleBranches': {
    invalidates: [],
    commands: ['for-each-ref', 'rev-list', 'merge-base.is-ancestor'],
    stateSource: 'git'
  },
  'maintenance.removeStaleBranches': {
    invalidates: ['branch.list', 'log.graph'],
    commands: ['update-ref', 'reflog', 'gc'],
    stateSource: 'git'
  },
  'maintenance.prune': {
    invalidates: [],
    commands: ['reflog', 'gc'],
    stateSource: 'git'
  }
} as const satisfies Record<string, GitIpcMethodMeta>

export type GitIpcMethod = keyof typeof GIT_IPC_METHODS

export interface GitIpcParamsMap {
  'repo.status': void
  'log.graph': P.LogGraphParams | void
  'log.show': P.LogShowParams
  'log.message': P.LogMessageParams
  'log.tree': P.LogTreeParams
  'log.file': P.LogFileParams
  'log.pickaxe': P.LogPickaxeParams
  'log.search': P.LogSearchParams
  'branch.list': void
  'branch.checkout': P.BranchCheckoutParams
  'branch.create': P.BranchCreateParams
  'branch.delete': P.BranchDeleteParams
  'branch.rename': P.BranchRenameParams
  'branch.checkoutRemote': P.BranchCheckoutRemoteParams
  'branch.setUpstream': P.BranchSetUpstreamParams
  'branch.unsetUpstream': P.BranchUnsetUpstreamParams | void
  'branch.deleteRemote': P.BranchDeleteRemoteParams
  'tag.list': void
  'tag.create': P.TagCreateParams
  'tag.delete': P.TagDeleteParams
  'tag.push': P.TagPushParams | void
  'tag.rename': P.TagRenameParams
  'working.status': void
  'working.cleanPreview': P.WorkingCleanParams | void
  'working.read': P.WorkingReadParams
  'working.discard': P.WorkingDiscardParams
  'working.remove': P.WorkingRemoveParams
  'working.clean': P.WorkingCleanParams | void
  'working.write': P.WorkingWriteParams
  'working.rename': P.WorkingRenameParams
  'working.addToGitignore': P.WorkingAddToGitignoreParams
  'stage.add': P.StageAddParams | void
  'stage.reset': P.StageResetParams | void
  'stage.applyPatch': P.StageApplyPatchParams
  'commit.create': P.CommitCreateParams
  'commit.reword': P.CommitRewordParams
  'commit.revert': P.CommitRevertParams
  'diff.working': P.DiffPathParams | void
  'diff.staged': P.DiffPathParams | void
  'diff.commits': P.DiffCommitsParams
  'diff.commitRange': P.DiffCommitRangeParams
  'diff.show': P.DiffShowParams
  'file.read': P.FileReadParams
  'file.blame': P.FileBlameParams
  'file.readStage': P.FileReadStageParams
  'reflog.list': P.ReflogListParams | void
  'undo.peek': void
  'undo.last': void
  'notes.list': P.NotesListParams | void
  'notes.add': P.NotesAddParams
  'bisect.status': void
  'bisect.start': P.BisectStartParams
  'bisect.good': P.BisectRefParams | void
  'bisect.bad': P.BisectRefParams | void
  'bisect.reset': void
  'config.get': P.ConfigGetParams
  'config.set': P.ConfigSetParams
  'config.list': P.ConfigListParams | void
  'hooks.list': void
  'hooks.read': P.HooksReadParams
  'hooks.write': P.HooksWriteParams
  'hooks.enable': P.HooksNameParams
  'hooks.disable': P.HooksNameParams
  'hooks.delete': P.HooksNameParams
  'remote.list': void
  'remote.add': P.RemoteAddParams
  'remote.remove': P.RemoteRemoveParams
  'remote.rename': P.RemoteRenameParams
  'remote.setUrl': P.RemoteSetUrlParams
  fetch: P.FetchParams | void
  push: P.PushParams | void
  pull: P.PullParams | void
  'stash.list': void
  'stash.show': P.StashShowParams | void
  'stash.files': P.StashIndexParams | void
  'stash.push': P.StashPushParams | void
  'stash.branch': P.StashBranchParams
  'stash.pop': P.StashIndexParams | void
  'stash.apply': P.StashIndexParams | void
  'stash.drop': P.StashIndexParams | void
  'worktree.list': void
  'worktree.add': P.WorktreeAddParams
  'worktree.remove': P.WorktreeRemoveParams
  'worktree.prune': void
  'submodule.list': void
  'submodule.add': P.SubmoduleAddParams
  'submodule.init': P.SubmodulePathsParams | void
  'submodule.update': P.SubmoduleUpdateParams | void
  'submodule.sync': P.SubmodulePathsParams | void
  'submodule.deinit': P.SubmoduleDeinitParams
  'submodule.remove': P.SubmoduleRemoveParams
  'submodule.setUrl': P.SubmoduleSetUrlParams
  'merge.status': void
  'merge.start': P.MergeStartParams
  'merge.into': P.MergeIntoParams
  'merge.squashInto': P.MergeSquashIntoParams
  'merge.abort': void
  'merge.continue': P.MergeContinueParams | void
  'rebase.start': P.RebaseStartParams
  'rebase.interactive': P.RebaseInteractiveParams
  'rebase.abort': void
  'rebase.continue': P.RebaseContinueParams | void
  'rebase.skip': void
  'cherry-pick': P.CherryPickParams
  'cherry-pick.continue': P.RebaseContinueParams | void
  'cherry-pick.abort': void
  'cherry-pick.skip': void
  'rebase.squash': P.RebaseHashesParams
  'rebase.drop': P.RebaseHashesParams
  reset: P.ResetParams
  'reset.head': P.ResetHeadParams
  'maintenance.unreachable': void
  'maintenance.staleBranches': P.MaintenanceStaleBranchesParams
  'maintenance.removeStaleBranches': P.MaintenanceRemoveStaleBranchesParams
  'maintenance.prune': void
}

export interface GitIpcResultMap {
  'repo.status': R.GitRepoStatus
  'log.graph': R.GitLogGraphResult
  'log.show': R.GitDiffResult
  'log.message': string
  'log.tree': string[]
  'log.file': R.GitCommit[]
  'log.pickaxe': R.GitCommit[]
  'log.search': R.GitCommit[]
  'branch.list': R.GitBranch[]
  'branch.checkout': void
  'branch.create': void
  'branch.delete': void
  'branch.rename': void
  'branch.checkoutRemote': void
  'branch.setUpstream': void
  'branch.unsetUpstream': void
  'branch.deleteRemote': void
  'tag.list': R.GitTag[]
  'tag.create': void
  'tag.delete': void
  'tag.push': void
  'tag.rename': void
  'working.status': R.GitWorkingStatus
  'working.cleanPreview': string[]
  'working.read': R.WorkingReadResult
  'working.discard': void
  'working.remove': void
  'working.clean': void
  'working.write': void
  'working.rename': void
  'working.addToGitignore': void
  'stage.add': void
  'stage.reset': void
  'stage.applyPatch': void
  'commit.create': string
  'commit.reword': void
  'commit.revert': void
  'diff.working': R.GitDiffResult
  'diff.staged': R.GitDiffResult
  'diff.commits': R.GitDiffResult
  'diff.commitRange': R.GitDiffResult
  'diff.show': R.GitDiffResult
  'file.read': string
  'file.blame': R.GitBlameLine[]
  'file.readStage': string
  'reflog.list': R.GitReflogEntry[]
  'undo.peek': R.UndoPeekResult
  'undo.last': R.UndoResult
  'notes.list': R.GitNoteEntry[]
  'notes.add': void
  'bisect.status': R.GitBisectStatus
  'bisect.start': void
  'bisect.good': void
  'bisect.bad': void
  'bisect.reset': void
  'config.get': string
  'config.set': void
  'config.list': Record<string, string>
  'hooks.list': R.GitHooksListResult
  'hooks.read': string
  'hooks.write': void
  'hooks.enable': void
  'hooks.disable': void
  'hooks.delete': void
  'remote.list': R.GitRemote[]
  'remote.add': void
  'remote.remove': void
  'remote.rename': void
  'remote.setUrl': void
  fetch: void
  push: void
  pull: void
  'stash.list': R.GitStashEntry[]
  'stash.show': R.GitDiffResult
  'stash.files': string
  'stash.push': void
  'stash.branch': void
  'stash.pop': void
  'stash.apply': void
  'stash.drop': void
  'worktree.list': R.GitWorktreeEntry[]
  'worktree.add': string
  'worktree.remove': void
  'worktree.prune': void
  'submodule.list': R.GitSubmoduleEntry[]
  'submodule.add': void
  'submodule.init': void
  'submodule.update': void
  'submodule.sync': void
  'submodule.deinit': void
  'submodule.remove': void
  'submodule.setUrl': void
  'merge.status': R.GitMergeStatus
  'merge.start': R.GitMergeStartResult
  'merge.into': R.GitMergeStartResult
  'merge.squashInto': R.GitSquashMergeIntoResult
  'merge.abort': void
  'merge.continue': void
  'rebase.start': void
  'rebase.interactive': void
  'rebase.abort': void
  'rebase.continue': void
  'rebase.skip': void
  'cherry-pick': void
  'cherry-pick.continue': void
  'cherry-pick.abort': void
  'cherry-pick.skip': void
  'rebase.squash': void
  'rebase.drop': void
  reset: void
  'reset.head': void
  'maintenance.unreachable': R.UnreachableSummary
  'maintenance.staleBranches': R.StaleBranchSummary
  'maintenance.removeStaleBranches': R.RemoveStaleBranchesResult
  'maintenance.prune': R.MaintenancePruneResult
}

export type GitIpcParams<M extends GitIpcMethod> = GitIpcParamsMap[M] extends void
  ? undefined
  : GitIpcParamsMap[M]

export type GitIpcResult<M extends GitIpcMethod> = GitIpcResultMap[M]

export function gitIpcInvalidates(method: GitIpcMethod): readonly string[] {
  return GIT_IPC_METHODS[method].invalidates
}

export const ALL_GIT_IPC_METHODS = Object.keys(GIT_IPC_METHODS) as GitIpcMethod[]
