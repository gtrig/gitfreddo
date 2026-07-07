import type { PushSubmoduleRecursion, SubmoduleRecursion } from '../../submodule-types'

/** Params for `branch.checkout` IPC — maps to `git switch [--detach] <ref>`. */
export interface BranchCheckoutParams {
  name: string
  detach?: boolean
}

export interface LogGraphParams {
  maxCount?: number
}

export interface LogShowParams {
  hash: string
}

export interface LogMessageParams {
  hash: string
}

export interface LogFileParams {
  path: string
  maxCount?: number
}

export interface LogPickaxeParams {
  query: string
  mode?: 'pickaxe' | 'regex'
  maxCount?: number
}

export interface LogSearchParams {
  author?: string
  grep?: string
  since?: string
  until?: string
  maxCount?: number
}

export interface BranchCreateParams {
  name: string
  startPoint?: string
}

export interface BranchDeleteParams {
  name: string
  force?: boolean
}

export interface BranchRenameParams {
  oldName: string
  newName: string
}

export interface BranchCheckoutRemoteParams {
  remoteBranch: string
  localName?: string
}

export interface BranchSetUpstreamParams {
  branch: string
  upstream: string
}

export interface BranchUnsetUpstreamParams {
  branch?: string
}

export interface BranchDeleteRemoteParams {
  remote: string
  branch: string
}

export interface TagCreateParams {
  name: string
  target?: string
  message?: string
  sign?: boolean
}

export interface TagDeleteParams {
  name: string
  remote?: string
  alsoDeleteRemote?: boolean
}

export interface TagPushParams {
  name?: string
  remote?: string
}

export interface TagRenameParams {
  oldName: string
  newName: string
}

export interface StageAddParams {
  paths?: string[]
}

export interface StageResetParams {
  paths?: string[]
}

export interface WorkingDiscardParams {
  paths: string[]
  staged?: boolean
}

export interface WorkingRemoveParams {
  paths: string[]
}

export interface WorkingCleanParams {
  includeIgnored?: boolean
}

export interface CommitCreateParams {
  message: string
  amend?: boolean
  sign?: boolean
}

export interface CommitRewordParams {
  hash: string
  message: string
}

export interface DiffPathParams {
  path?: string
  wordDiff?: boolean
}

export interface DiffCommitsParams {
  fromRef: string
  toRef: string
  path?: string
}

export interface DiffCommitRangeParams {
  oldestHash: string
  newestHash: string
}

export interface DiffShowParams {
  ref: string
  path?: string
}

export interface FileReadParams {
  ref: string
  path: string
}

export interface FileBlameParams {
  path: string
  ref?: string
}

export interface FileReadStageParams {
  stage?: 1 | 2 | 3
  path: string
}

export interface ReflogListParams {
  maxCount?: number
}

export interface NotesListParams {
  hash?: string
}

export interface NotesAddParams {
  hash: string
  message: string
  force?: boolean
}

export interface BisectStartParams {
  badRef: string
  goodRef?: string
}

export interface BisectRefParams {
  ref?: string
}

export interface WorkingWriteParams {
  path: string
  content: string
}

export interface WorkingReadParams {
  path: string
}

export interface WorkingRenameParams {
  oldPath: string
  newPath: string
}

export interface WorkingAddToGitignoreParams {
  path: string
  directory?: boolean
}

export interface StageApplyPatchParams {
  patch: string
  reverse?: boolean
}

export interface ConfigGetParams {
  key: string
  scope?: 'local' | 'global'
}

export interface ConfigSetParams {
  key: string
  value: string
  scope?: 'local' | 'global'
}

export interface ConfigListParams {
  scope?: 'local' | 'global'
}

export interface HooksReadParams {
  name: string
}

export interface HooksWriteParams {
  name: string
  content: string
}

export interface HooksNameParams {
  name: string
}

export interface RemoteAddParams {
  name: string
  url: string
}

export interface RemoteRemoveParams {
  name: string
}

export interface RemoteRenameParams {
  oldName: string
  newName: string
}

export interface RemoteSetUrlParams {
  name: string
  url: string
  push?: boolean
}

export interface FetchParams {
  remote?: string
  tags?: boolean
  tagsOnly?: boolean
  refspec?: string
}

export interface PushParams {
  remote?: string
  branch?: string
  setUpstream?: boolean
  force?: boolean
  pushAll?: boolean
}

export interface PullParams {
  remote?: string
  branch?: string
  rebase?: boolean
}

export interface StashIndexParams {
  index?: number
}

export interface StashShowParams {
  index?: number
  path?: string
}

export interface StashPushParams {
  message?: string
  includeUntracked?: boolean
  includeIgnored?: boolean
  paths?: string[]
}

export interface StashBranchParams {
  branchName: string
  index?: number
}

export interface WorktreeAddParams {
  path: string
  branch?: string
  newBranch?: string
  detach?: boolean
  commit?: string
}

export interface WorktreeRemoveParams {
  path: string
  force?: boolean
}

export interface SubmoduleAddParams {
  url: string
  path: string
  branch?: string
}

export interface SubmodulePathsParams {
  paths?: string[]
  recursive?: boolean
}

export interface SubmoduleUpdateParams {
  paths?: string[]
  init?: boolean
  recursive?: boolean
  remote?: boolean
  merge?: boolean
  rebase?: boolean
}

export interface SubmoduleDeinitParams {
  path: string
  force?: boolean
}

export interface SubmoduleRemoveParams {
  path: string
  force?: boolean
}

export interface SubmoduleSetUrlParams {
  path: string
  url: string
}

export interface MergeStartParams {
  branch: string
  noFf?: boolean
  squash?: boolean
}

export interface MergeContinueParams {
  message?: string
}

export interface RebaseStartParams {
  onto: string
  from?: string
}

export interface RebaseInteractiveParams {
  baseHash: string
  todoLines: string[]
}

export interface RebaseContinueParams {
  message?: string
}

export interface CherryPickParams {
  hash?: string
  hashes?: string[]
  noCommit?: boolean
  mainline?: number
}

export interface RebaseHashesParams {
  hashes: string[]
}

export interface CommitRevertParams {
  hash: string
  mainline?: number
}

export interface ResetParams {
  mode: 'soft' | 'mixed' | 'hard'
  ref?: string
}

export interface ResetHeadParams {
  mode: 'soft' | 'mixed' | 'hard'
}

export interface MaintenanceStaleBranchesParams {
  hashes?: string[]
  hash?: string
}

export interface MaintenanceRemoveStaleBranchesParams {
  refs?: string[]
  branchNames?: string[]
}

export type GitIpcSettingsKey = 'submoduleRecursion' | 'pushSubmoduleRecursion' | 'pullRebase'

export type GitIpcSettings = {
  submoduleRecursion?: SubmoduleRecursion
  pushSubmoduleRecursion?: PushSubmoduleRecursion
  pullRebase?: boolean
}
