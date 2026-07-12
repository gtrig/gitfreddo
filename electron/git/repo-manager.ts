import { emitLog } from './log-bus'
import { normalizeRepoPath, hasGitDir } from './repo-path'
import { resolve } from 'path'
import * as repoOps from './operations/repo'
import * as branchOps from './operations/branch'
import * as logOps from './operations/log'
import * as statusOps from './operations/status'
import * as diffOps from './operations/diff'
import * as remoteOps from './operations/remote'
import * as stashOps from './operations/stash'
import * as mergeOps from './operations/merge'
import * as rebaseOps from './operations/rebase'
import * as maintenanceOps from './operations/maintenance'
import * as tagOps from './operations/tag'
import * as worktreeOps from './operations/worktree'
import * as blameOps from './operations/blame'
import * as reflogOps from './operations/reflog'
import * as logSearchOps from './operations/log-search'
import * as bisectOps from './operations/bisect'
import * as notesOps from './operations/notes'
import * as workingOps from './operations/working'
import * as configOps from './operations/config'
import * as hooksOps from './operations/hooks'
import * as submoduleOps from './operations/submodule'
import * as undoOps from './operations/undo'
import { loadSettings } from '../settings'
import type { GitIpcMethod, GitIpcParams, GitIpcResult } from '../../shared/git/ipc'

const MAX_PARAM_CHARS = 240

export interface RepoManagerConfig {
  gitBinaryPath: string
}

function serializeParams(params: unknown): string {
  if (params === undefined || params === null) return '{}'
  try {
    const serialized = JSON.stringify(params)
    return serialized.length <= MAX_PARAM_CHARS
      ? serialized
      : `${serialized.slice(0, MAX_PARAM_CHARS)}…`
  } catch {
    return String(params)
  }
}

type P = Record<string, unknown>
type InvokeHandler = (cwd: string, git: string, p: P, self: RepoManager) => unknown | Promise<unknown>

/**
 * Per-domain handler registry keyed by every entry in GIT_IPC_METHODS.
 * TypeScript enforces that all methods are covered — no hand-maintained list needed.
 */
function buildHandlerRegistry(): Record<GitIpcMethod, InvokeHandler> {
  return {
    'repo.status': (cwd, git) => repoOps.repoStatus(cwd, git),
    'log.graph': (cwd, git, p) => logOps.logGraph(cwd, git, (p.maxCount as number) ?? 500),
    'log.show': (cwd, git, p) => logOps.showCommit(cwd, git, p.hash as string),
    'log.message': (cwd, git, p) => logOps.commitMessage(cwd, git, p.hash as string),
    'log.tree': (cwd, git, p) => logOps.listTreeFiles(cwd, git, p.hash as string),
    'branch.list': (cwd, git) => branchOps.branchList(cwd, git),
    'branch.checkout': (cwd, git, p) =>
      branchOps.branchCheckout(cwd, git, p.name as string, {
        detach: p.detach === true ? true : p.detach === false ? false : undefined
      }),
    'branch.create': (cwd, git, p) =>
      branchOps.branchCreate(cwd, git, p.name as string, p.startPoint as string | undefined),
    'branch.delete': (cwd, git, p) =>
      branchOps.branchDelete(cwd, git, p.name as string, Boolean(p.force)),
    'branch.rename': (cwd, git, p) =>
      branchOps.branchRename(cwd, git, p.oldName as string, p.newName as string),
    'branch.checkoutRemote': (cwd, git, p) =>
      branchOps.branchCheckoutRemote(cwd, git, p.remoteBranch as string, p.localName as string | undefined),
    'branch.setUpstream': (cwd, git, p) =>
      branchOps.branchSetUpstream(cwd, git, p.branch as string, p.upstream as string),
    'branch.unsetUpstream': (cwd, git, p) =>
      branchOps.branchUnsetUpstream(cwd, git, p.branch as string | undefined),
    'branch.deleteRemote': (cwd, git, p) =>
      branchOps.branchDeleteRemote(cwd, git, p.remote as string, p.branch as string),
    'tag.list': (cwd, git) => tagOps.tagList(cwd, git),
    'tag.create': (cwd, git, p) =>
      tagOps.tagCreate(cwd, git, p.name as string, p.target as string | undefined, p.message as string | undefined, Boolean(p.sign)),
    'tag.delete': (cwd, git, p) =>
      tagOps.tagDelete(cwd, git, p.name as string, p.remote as string | undefined, Boolean(p.alsoDeleteRemote)),
    'tag.push': (cwd, git, p) =>
      tagOps.tagPush(cwd, git, p.name as string | undefined, p.remote as string | undefined),
    'tag.rename': (cwd, git, p) =>
      tagOps.tagRename(cwd, git, p.oldName as string, p.newName as string),
    'working.status': (cwd, git) => statusOps.workingStatus(cwd, git),
    'stage.add': (cwd, git, p) => statusOps.stageAdd(cwd, git, (p.paths as string[]) ?? []),
    'stage.reset': (cwd, git, p) => statusOps.stageReset(cwd, git, p.paths as string[] | undefined),
    'working.discard': (cwd, git, p) =>
      statusOps.workingDiscard(cwd, git, (p.paths as string[]) ?? [], Boolean(p.staged)),
    'working.remove': (cwd, git, p) => statusOps.workingRemove(cwd, git, (p.paths as string[]) ?? []),
    'working.cleanPreview': (cwd, git, p) => statusOps.workingCleanPreview(cwd, git, Boolean(p.includeIgnored)),
    'working.clean': (cwd, git, p) => statusOps.workingClean(cwd, git, Boolean(p.includeIgnored)),
    'commit.create': (cwd, git, p) =>
      statusOps.commitCreate(cwd, git, p.message as string, Boolean(p.amend), Boolean(p.sign)),
    'commit.reword': (cwd, git, p) =>
      rebaseOps.rebaseReword(cwd, git, p.hash as string, p.message as string),
    'diff.working': (cwd, git, p) =>
      diffOps.diffWorking(cwd, git, p.path as string | undefined, Boolean(p.wordDiff)),
    'diff.staged': (cwd, git, p) =>
      diffOps.diffStaged(cwd, git, p.path as string | undefined, Boolean(p.wordDiff)),
    'diff.commits': (cwd, git, p) =>
      diffOps.diffCommits(
        cwd, git, p.fromRef as string, p.toRef as string,
        p.path as string | undefined, Boolean(p.mergeBase),
        Array.isArray(p.paths) ? (p.paths as string[]) : undefined
      ),
    'diff.commitRange': (cwd, git, p) =>
      diffOps.diffCommitRange(cwd, git, p.oldestHash as string, p.newestHash as string),
    'diff.show': (cwd, git, p) =>
      diffOps.diffShow(cwd, git, p.ref as string, p.path as string | undefined),
    'file.read': (cwd, git, p) => diffOps.fileRead(cwd, git, p.ref as string, p.path as string),
    'file.blame': (cwd, git, p) =>
      blameOps.fileBlame(cwd, git, p.path as string, p.ref as string | undefined),
    'file.readStage': (cwd, git, p) =>
      workingOps.fileReadStage(cwd, git, (p.stage as 1 | 2 | 3) ?? 2, p.path as string),
    'log.file': (cwd, git, p) =>
      logSearchOps.logFile(cwd, git, p.path as string, (p.maxCount as number) ?? 100),
    'log.pickaxe': (cwd, git, p) =>
      logSearchOps.logPickaxe(
        cwd, git, p.query as string,
        (p.mode as 'pickaxe' | 'regex') ?? 'pickaxe',
        (p.maxCount as number) ?? 100
      ),
    'log.search': (cwd, git, p) =>
      logSearchOps.logSearch(cwd, git, {
        author: p.author as string | undefined,
        grep: p.grep as string | undefined,
        since: p.since as string | undefined,
        until: p.until as string | undefined,
        maxCount: p.maxCount as number | undefined
      }),
    'reflog.list': (cwd, git, p) =>
      reflogOps.reflogList(cwd, git, (p.maxCount as number) ?? 200),
    'undo.peek': (cwd, git) => undoOps.peekUndoAction(cwd, git),
    'undo.last': (cwd, git) => undoOps.undoLastAction(cwd, git),
    'notes.list': (cwd, git, p) => notesOps.notesList(cwd, git, p.hash as string | undefined),
    'notes.add': (cwd, git, p) =>
      notesOps.notesAdd(cwd, git, p.hash as string, p.message as string, { force: Boolean(p.force) }),
    'bisect.status': (cwd, git) => bisectOps.bisectStatus(cwd, git),
    'bisect.start': (cwd, git, p) =>
      bisectOps.bisectStart(cwd, git, p.badRef as string, p.goodRef as string | undefined),
    'bisect.good': (cwd, git, p) => bisectOps.bisectGood(cwd, git, p.ref as string | undefined),
    'bisect.bad': (cwd, git, p) => bisectOps.bisectBad(cwd, git, p.ref as string | undefined),
    'bisect.reset': (cwd, git) => bisectOps.bisectReset(cwd, git),
    'working.write': (cwd, git, p) =>
      workingOps.workingWrite(cwd, git, p.path as string, p.content as string),
    'working.read': (cwd, git, p) => workingOps.workingRead(cwd, git, p.path as string),
    'working.rename': (cwd, git, p) =>
      workingOps.workingRename(cwd, git, p.oldPath as string, p.newPath as string),
    'working.addToGitignore': (cwd, git, p) =>
      workingOps.workingAddToGitignore(cwd, git, p.path as string, Boolean(p.directory)),
    'stage.applyPatch': (cwd, git, p) =>
      workingOps.stageApplyPatch(cwd, git, p.patch as string, Boolean(p.reverse)),
    'config.get': (cwd, git, p) =>
      configOps.configGet(cwd, git, p.key as string, (p.scope as 'local' | 'global') ?? 'local'),
    'config.set': (cwd, git, p) =>
      configOps.configSet(cwd, git, p.key as string, p.value as string, (p.scope as 'local' | 'global') ?? 'local'),
    'config.list': (cwd, git, p) =>
      configOps.configList(cwd, git, (p.scope as 'local' | 'global') ?? 'local'),
    'hooks.list': (cwd, git) => hooksOps.hooksList(cwd, git),
    'hooks.read': (cwd, git, p) => hooksOps.hooksRead(cwd, git, p.name as string),
    'hooks.write': (cwd, git, p) => hooksOps.hooksWrite(cwd, git, p.name as string, p.content as string),
    'hooks.enable': (cwd, git, p) => hooksOps.hooksEnable(cwd, git, p.name as string),
    'hooks.disable': (cwd, git, p) => hooksOps.hooksDisable(cwd, git, p.name as string),
    'hooks.delete': (cwd, git, p) => hooksOps.hooksDelete(cwd, git, p.name as string),
    'remote.list': (cwd, git) => remoteOps.remoteList(cwd, git),
    'remote.add': (cwd, git, p) => remoteOps.remoteAdd(cwd, git, p.name as string, p.url as string),
    'remote.remove': (cwd, git, p) => remoteOps.remoteRemove(cwd, git, p.name as string),
    'remote.rename': (cwd, git, p) =>
      remoteOps.remoteRename(cwd, git, p.oldName as string, p.newName as string),
    'remote.setUrl': (cwd, git, p) =>
      remoteOps.remoteSetUrl(cwd, git, p.name as string, p.url as string, Boolean(p.push)),
    'fetch': async (cwd, git, p) => {
      const settings = await loadSettings()
      return remoteOps.fetchRemote(cwd, git, {
        remote: p.remote as string | undefined,
        tags: Boolean(p.tags),
        tagsOnly: Boolean(p.tagsOnly),
        refspec: p.refspec as string | undefined,
        submoduleRecursion: settings.submoduleRecursion
      })
    },
    'push': async (cwd, git, p) => {
      const settings = await loadSettings()
      return remoteOps.pushRemote(
        cwd, git,
        p.remote as string | undefined, p.branch as string | undefined,
        Boolean(p.setUpstream), Boolean(p.force), Boolean(p.pushAll),
        settings.pushSubmoduleRecursion
      )
    },
    'pull': async (cwd, git, p) => {
      const settings = await loadSettings()
      return remoteOps.pullRemote(
        cwd, git,
        p.remote as string | undefined, p.branch as string | undefined,
        Boolean(p.rebase), settings.submoduleRecursion
      )
    },
    'stash.list': (cwd, git) => stashOps.stashList(cwd, git),
    'stash.show': (cwd, git, p) =>
      stashOps.stashShow(cwd, git, (p.index as number) ?? 0, p.path as string | undefined),
    'stash.files': (cwd, git, p) => stashOps.stashFiles(cwd, git, (p.index as number) ?? 0),
    'stash.push': (cwd, git, p) =>
      stashOps.stashPush(cwd, git, p.message as string | undefined, {
        includeUntracked: Boolean(p.includeUntracked),
        includeIgnored: Boolean(p.includeIgnored),
        paths: p.paths as string[] | undefined
      }),
    'stash.branch': (cwd, git, p) =>
      stashOps.stashBranch(cwd, git, p.branchName as string, (p.index as number) ?? 0),
    'stash.pop': (cwd, git, p) => stashOps.stashPop(cwd, git, (p.index as number) ?? 0),
    'stash.apply': (cwd, git, p) => stashOps.stashApply(cwd, git, (p.index as number) ?? 0),
    'stash.drop': (cwd, git, p) => stashOps.stashDrop(cwd, git, (p.index as number) ?? 0),
    'worktree.list': (cwd, git) => worktreeOps.worktreeList(cwd, git),
    'worktree.add': (cwd, git, p) =>
      worktreeOps.worktreeAdd(cwd, git, {
        path: p.path as string,
        branch: p.branch as string | undefined,
        newBranch: p.newBranch as string | undefined,
        detach: Boolean(p.detach),
        commit: p.commit as string | undefined
      }),
    'worktree.remove': async (cwd, git, p, self) => {
      const removePath = normalizeRepoPath(p.path as string)
      await worktreeOps.worktreeRemove(cwd, git, removePath, Boolean(p.force))
      if (self.repos.has(removePath)) {
        await self.disconnectRepo(removePath)
      }
    },
    'worktree.prune': (cwd, git) => worktreeOps.worktreePrune(cwd, git),
    'submodule.list': (cwd, git) => submoduleOps.submoduleList(cwd, git),
    'submodule.add': (cwd, git, p) =>
      submoduleOps.submoduleAdd(cwd, git, {
        url: p.url as string,
        path: p.path as string,
        branch: p.branch as string | undefined
      }),
    'submodule.init': (cwd, git, p) =>
      submoduleOps.submoduleInit(cwd, git, p.paths as string[] | undefined, Boolean(p.recursive)),
    'submodule.update': (cwd, git, p) =>
      submoduleOps.submoduleUpdate(cwd, git, {
        paths: p.paths as string[] | undefined,
        init: Boolean(p.init),
        recursive: Boolean(p.recursive),
        remote: Boolean(p.remote),
        merge: Boolean(p.merge),
        rebase: Boolean(p.rebase)
      }),
    'submodule.sync': (cwd, git, p) =>
      submoduleOps.submoduleSync(cwd, git, p.paths as string[] | undefined, Boolean(p.recursive)),
    'submodule.deinit': async (cwd, git, p, self) => {
      const deinitPath = normalizeRepoPath(resolve(cwd, p.path as string))
      await submoduleOps.submoduleDeinit(cwd, git, p.path as string, Boolean(p.force))
      if (self.repos.has(deinitPath)) {
        await self.disconnectRepo(deinitPath)
      }
    },
    'submodule.remove': async (cwd, git, p, self) => {
      const removePath = normalizeRepoPath(resolve(cwd, p.path as string))
      await submoduleOps.submoduleRemove(cwd, git, p.path as string, Boolean(p.force))
      if (self.repos.has(removePath)) {
        await self.disconnectRepo(removePath)
      }
    },
    'submodule.setUrl': (cwd, git, p) =>
      submoduleOps.submoduleSetUrl(cwd, git, p.path as string, p.url as string),
    'merge.status': (cwd, git) => mergeOps.mergeStatus(cwd, git),
    'merge.start': (cwd, git, p) =>
      mergeOps.mergeStart(cwd, git, p.branch as string, { noFf: Boolean(p.noFf), squash: Boolean(p.squash) }),
    'merge.squashInto': (cwd, git, p) =>
      mergeOps.mergeSquashInto(cwd, git, {
        sourceBranch: p.sourceBranch as string,
        targetBranch: p.targetBranch as string,
        message: p.message as string | undefined
      }),
    'merge.abort': (cwd, git) => mergeOps.mergeAbort(cwd, git),
    'merge.continue': (cwd, git, p) => mergeOps.mergeContinue(cwd, git, p.message as string | undefined),
    'rebase.start': (cwd, git, p) =>
      rebaseOps.rebaseStart(cwd, git, p.onto as string, p.from as string | undefined),
    'rebase.interactive': (cwd, git, p) =>
      rebaseOps.rebaseInteractive(cwd, git, p.baseHash as string, p.todoLines as string[]),
    'rebase.abort': (cwd, git) => rebaseOps.rebaseAbort(cwd, git),
    'rebase.continue': (cwd, git, p) => rebaseOps.rebaseContinue(cwd, git, p.message as string | undefined),
    'rebase.skip': (cwd, git) => rebaseOps.rebaseSkip(cwd, git),
    'cherry-pick.continue': (cwd, git, p) =>
      rebaseOps.cherryPickContinue(cwd, git, p.message as string | undefined),
    'cherry-pick.abort': (cwd, git) => rebaseOps.cherryPickAbort(cwd, git),
    'cherry-pick.skip': (cwd, git) => rebaseOps.cherryPickSkip(cwd, git),
    'cherry-pick': (cwd, git, p) => {
      if (Array.isArray(p.hashes) && p.hashes.length > 0) {
        return rebaseOps.cherryPickMultiple(
          cwd, git, p.hashes as string[], Boolean(p.noCommit),
          typeof p.mainline === 'number' ? p.mainline : undefined
        )
      }
      return rebaseOps.cherryPick(
        cwd, git, p.hash as string, Boolean(p.noCommit),
        typeof p.mainline === 'number' ? p.mainline : undefined
      )
    },
    'rebase.squash': (cwd, git, p) => rebaseOps.rebaseSquash(cwd, git, p.hashes as string[]),
    'rebase.drop': (cwd, git, p) => rebaseOps.rebaseDrop(cwd, git, p.hashes as string[]),
    'commit.revert': (cwd, git, p) =>
      rebaseOps.revertCommit(
        cwd, git, p.hash as string,
        typeof p.mainline === 'number' ? p.mainline : undefined
      ),
    'reset': (cwd, git, p) =>
      rebaseOps.resetRepo(cwd, git, p.mode as 'soft' | 'mixed' | 'hard', p.ref as string | undefined),
    'reset.head': (cwd, git, p) =>
      rebaseOps.resetToParent(cwd, git, p.mode as 'soft' | 'mixed' | 'hard'),
    'maintenance.unreachable': (cwd, git) => maintenanceOps.listUnreachableCommits(cwd, git),
    'maintenance.staleBranches': (cwd, git, p) => {
      const hashes = Array.isArray(p.hashes)
        ? (p.hashes as string[])
        : typeof p.hash === 'string' && p.hash
          ? [p.hash]
          : []
      return maintenanceOps.listStaleLocalBranches(cwd, git, hashes)
    },
    'maintenance.removeStaleBranches': (cwd, git, p) =>
      maintenanceOps.removeStaleRefs(
        cwd, git,
        Array.isArray(p.refs) && p.refs.length > 0
          ? (p.refs as string[])
          : ((p.branchNames as string[]) ?? []).map((name) =>
              name.startsWith('refs/') ? name : `refs/heads/${name}`
            )
      ),
    'maintenance.prune': (cwd, git) => maintenanceOps.pruneStaleObjects(cwd, git)
  }
}

export class RepoManager {
  repos = new Set<string>()
  private activePath: string | null = null
  private config: RepoManagerConfig = { gitBinaryPath: 'git' }
  private readonly handlers: Record<GitIpcMethod, InvokeHandler> = buildHandlerRegistry()

  setConfig(patch: Partial<RepoManagerConfig>): void {
    this.config = { ...this.config, ...patch }
  }

  listRepos(): string[] {
    return [...this.repos]
  }

  getRepoPath(): string | null {
    return this.activePath
  }

  async connect(repoPath: string): Promise<string> {
    const normalized = normalizeRepoPath(repoPath)
    if (!hasGitDir(normalized)) {
      throw new Error('No .git found. Open a folder initialized as a git repository.')
    }
    this.repos.add(normalized)
    this.activePath = normalized
    emitLog('app', 'info', 'Repository connected', normalized)
    return normalized
  }

  async switchRepo(repoPath: string): Promise<string> {
    const normalized = normalizeRepoPath(repoPath)
    if (!this.repos.has(normalized)) {
      return this.connect(normalized)
    }
    this.activePath = normalized
    return normalized
  }

  async disconnectRepo(repoPath: string): Promise<void> {
    const normalized = normalizeRepoPath(repoPath)
    this.repos.delete(normalized)
    if (this.activePath === normalized) {
      const remaining = [...this.repos]
      this.activePath = remaining[0] ?? null
    }
  }

  async disconnectAll(): Promise<void> {
    this.repos.clear()
    this.activePath = null
  }

  async invoke<M extends GitIpcMethod>(
    repoPath: string | undefined,
    method: M,
    params?: GitIpcParams<M>
  ): Promise<GitIpcResult<M>> {
    const result = await this.dispatchInvoke(repoPath, method, params)
    return result as GitIpcResult<M>
  }

  private async dispatchInvoke(
    repoPath: string | undefined,
    method: string,
    params: unknown = {}
  ): Promise<unknown> {
    const cwd = normalizeRepoPath(repoPath ?? this.activePath ?? '')
    if (!cwd || !this.repos.has(cwd)) {
      throw new Error('No repository connected')
    }
    const git = this.config.gitBinaryPath
    const p = (params ?? {}) as Record<string, unknown>

    emitLog('git', 'debug', `invoke ${method}`, serializeParams(params))

    const handler = this.handlers[method as GitIpcMethod]
    if (!handler) {
      throw new Error(`Unknown git method: ${method}`)
    }
    return handler(cwd, git, p, this)
  }
}
