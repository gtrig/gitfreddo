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
import { loadSettings } from '../settings'

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

export class RepoManager {
  private repos = new Set<string>()
  private activePath: string | null = null
  private config: RepoManagerConfig = { gitBinaryPath: 'git' }

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

  async invoke(repoPath: string | undefined, method: string, params: unknown = {}): Promise<unknown> {
    const cwd = normalizeRepoPath(repoPath ?? this.activePath ?? '')
    if (!cwd || !this.repos.has(cwd)) {
      throw new Error('No repository connected')
    }
    const git = this.config.gitBinaryPath
    const p = (params ?? {}) as Record<string, unknown>

    emitLog('git', 'debug', `invoke ${method}`, serializeParams(params))

    switch (method) {
      case 'repo.status':
        return repoOps.repoStatus(cwd, git)
      case 'log.graph':
        return logOps.logGraph(cwd, git, (p.maxCount as number) ?? 500)
      case 'log.show':
        return logOps.showCommit(cwd, git, p.hash as string)
      case 'log.message':
        return logOps.commitMessage(cwd, git, p.hash as string)
      case 'branch.list':
        return branchOps.branchList(cwd, git)
      case 'branch.checkout':
        return branchOps.branchCheckout(cwd, git, p.name as string)
      case 'branch.create':
        return branchOps.branchCreate(cwd, git, p.name as string, p.startPoint as string | undefined)
      case 'branch.delete':
        return branchOps.branchDelete(cwd, git, p.name as string, Boolean(p.force))
      case 'branch.rename':
        return branchOps.branchRename(cwd, git, p.oldName as string, p.newName as string)
      case 'branch.checkoutRemote':
        return branchOps.branchCheckoutRemote(
          cwd,
          git,
          p.remoteBranch as string,
          p.localName as string | undefined
        )
      case 'branch.setUpstream':
        return branchOps.branchSetUpstream(
          cwd,
          git,
          p.branch as string,
          p.upstream as string
        )
      case 'branch.unsetUpstream':
        return branchOps.branchUnsetUpstream(cwd, git, p.branch as string | undefined)
      case 'branch.deleteRemote':
        return branchOps.branchDeleteRemote(
          cwd,
          git,
          p.remote as string,
          p.branch as string
        )
      case 'tag.list':
        return tagOps.tagList(cwd, git)
      case 'tag.create':
        return tagOps.tagCreate(
          cwd,
          git,
          p.name as string,
          p.target as string | undefined,
          p.message as string | undefined,
          Boolean(p.sign)
        )
      case 'tag.delete':
        return tagOps.tagDelete(
          cwd,
          git,
          p.name as string,
          p.remote as string | undefined,
          Boolean(p.alsoDeleteRemote)
        )
      case 'tag.push':
        return tagOps.tagPush(cwd, git, p.name as string | undefined, p.remote as string | undefined)
      case 'tag.rename':
        return tagOps.tagRename(cwd, git, p.oldName as string, p.newName as string)
      case 'working.status':
        return statusOps.workingStatus(cwd, git)
      case 'stage.add':
        return statusOps.stageAdd(cwd, git, (p.paths as string[]) ?? [])
      case 'stage.reset':
        return statusOps.stageReset(cwd, git, p.paths as string[] | undefined)
      case 'working.discard':
        return statusOps.workingDiscard(
          cwd,
          git,
          (p.paths as string[]) ?? [],
          Boolean(p.staged)
        )
      case 'working.remove':
        return statusOps.workingRemove(cwd, git, (p.paths as string[]) ?? [])
      case 'working.cleanPreview':
        return statusOps.workingCleanPreview(cwd, git, Boolean(p.includeIgnored))
      case 'working.clean':
        return statusOps.workingClean(cwd, git, Boolean(p.includeIgnored))
      case 'commit.create':
        return statusOps.commitCreate(
          cwd,
          git,
          p.message as string,
          Boolean(p.amend),
          Boolean(p.sign)
        )
      case 'commit.reword':
        return rebaseOps.rebaseReword(cwd, git, p.hash as string, p.message as string)
      case 'diff.working':
        return diffOps.diffWorking(
          cwd,
          git,
          p.path as string | undefined,
          Boolean(p.wordDiff)
        )
      case 'diff.staged':
        return diffOps.diffStaged(
          cwd,
          git,
          p.path as string | undefined,
          Boolean(p.wordDiff)
        )
      case 'diff.commits':
        return diffOps.diffCommits(
          cwd,
          git,
          p.fromRef as string,
          p.toRef as string,
          p.path as string | undefined
        )
      case 'diff.commitRange':
        return diffOps.diffCommitRange(
          cwd,
          git,
          p.oldestHash as string,
          p.newestHash as string
        )
      case 'diff.show':
        return diffOps.diffShow(cwd, git, p.ref as string, p.path as string | undefined)
      case 'file.read':
        return diffOps.fileRead(cwd, git, p.ref as string, p.path as string)
      case 'file.blame':
        return blameOps.fileBlame(
          cwd,
          git,
          p.path as string,
          p.ref as string | undefined
        )
      case 'file.readStage':
        return workingOps.fileReadStage(
          cwd,
          git,
          (p.stage as 1 | 2 | 3) ?? 2,
          p.path as string
        )
      case 'log.file':
        return logSearchOps.logFile(
          cwd,
          git,
          p.path as string,
          (p.maxCount as number) ?? 100
        )
      case 'log.pickaxe':
        return logSearchOps.logPickaxe(
          cwd,
          git,
          p.query as string,
          (p.mode as 'pickaxe' | 'regex') ?? 'pickaxe',
          (p.maxCount as number) ?? 100
        )
      case 'log.search':
        return logSearchOps.logSearch(cwd, git, {
          author: p.author as string | undefined,
          grep: p.grep as string | undefined,
          since: p.since as string | undefined,
          until: p.until as string | undefined,
          maxCount: p.maxCount as number | undefined
        })
      case 'reflog.list':
        return reflogOps.reflogList(cwd, git, (p.maxCount as number) ?? 200)
      case 'notes.list':
        return notesOps.notesList(cwd, git, p.hash as string | undefined)
      case 'notes.add':
        return notesOps.notesAdd(cwd, git, p.hash as string, p.message as string, {
          force: Boolean(p.force)
        })
      case 'bisect.status':
        return bisectOps.bisectStatus(cwd, git)
      case 'bisect.start':
        return bisectOps.bisectStart(
          cwd,
          git,
          p.badRef as string,
          p.goodRef as string | undefined
        )
      case 'bisect.good':
        return bisectOps.bisectGood(cwd, git, p.ref as string | undefined)
      case 'bisect.bad':
        return bisectOps.bisectBad(cwd, git, p.ref as string | undefined)
      case 'bisect.reset':
        return bisectOps.bisectReset(cwd, git)
      case 'working.write':
        return workingOps.workingWrite(cwd, git, p.path as string, p.content as string)
      case 'working.read':
        return workingOps.workingRead(cwd, git, p.path as string)
      case 'working.rename':
        return workingOps.workingRename(cwd, git, p.oldPath as string, p.newPath as string)
      case 'working.addToGitignore':
        return workingOps.workingAddToGitignore(
          cwd,
          git,
          p.path as string,
          Boolean(p.directory)
        )
      case 'stage.applyPatch':
        return workingOps.stageApplyPatch(
          cwd,
          git,
          p.patch as string,
          Boolean(p.reverse)
        )
      case 'config.get':
        return configOps.configGet(
          cwd,
          git,
          p.key as string,
          (p.scope as 'local' | 'global') ?? 'local'
        )
      case 'config.set':
        return configOps.configSet(
          cwd,
          git,
          p.key as string,
          p.value as string,
          (p.scope as 'local' | 'global') ?? 'local'
        )
      case 'config.list':
        return configOps.configList(cwd, git, (p.scope as 'local' | 'global') ?? 'local')
      case 'hooks.list':
        return hooksOps.hooksList(cwd, git)
      case 'hooks.read':
        return hooksOps.hooksRead(cwd, git, p.name as string)
      case 'hooks.write':
        return hooksOps.hooksWrite(cwd, git, p.name as string, p.content as string)
      case 'hooks.enable':
        return hooksOps.hooksEnable(cwd, git, p.name as string)
      case 'hooks.disable':
        return hooksOps.hooksDisable(cwd, git, p.name as string)
      case 'hooks.delete':
        return hooksOps.hooksDelete(cwd, git, p.name as string)
      case 'remote.list':
        return remoteOps.remoteList(cwd, git)
      case 'remote.add':
        return remoteOps.remoteAdd(cwd, git, p.name as string, p.url as string)
      case 'remote.remove':
        return remoteOps.remoteRemove(cwd, git, p.name as string)
      case 'remote.rename':
        return remoteOps.remoteRename(cwd, git, p.oldName as string, p.newName as string)
      case 'remote.setUrl':
        return remoteOps.remoteSetUrl(
          cwd,
          git,
          p.name as string,
          p.url as string,
          Boolean(p.push)
        )
      case 'fetch': {
        const settings = await loadSettings()
        return remoteOps.fetchRemote(cwd, git, {
          remote: p.remote as string | undefined,
          tags: Boolean(p.tags),
          tagsOnly: Boolean(p.tagsOnly),
          refspec: p.refspec as string | undefined,
          submoduleRecursion: settings.submoduleRecursion
        })
      }
      case 'push': {
        const settings = await loadSettings()
        return remoteOps.pushRemote(
          cwd,
          git,
          p.remote as string | undefined,
          p.branch as string | undefined,
          Boolean(p.setUpstream),
          Boolean(p.force),
          Boolean(p.pushAll),
          settings.pushSubmoduleRecursion
        )
      }
      case 'pull': {
        const settings = await loadSettings()
        return remoteOps.pullRemote(
          cwd,
          git,
          p.remote as string | undefined,
          p.branch as string | undefined,
          Boolean(p.rebase),
          settings.submoduleRecursion
        )
      }
      case 'stash.list':
        return stashOps.stashList(cwd, git)
      case 'stash.show':
        return stashOps.stashShow(cwd, git, (p.index as number) ?? 0, p.path as string | undefined)
      case 'stash.files':
        return stashOps.stashFiles(cwd, git, (p.index as number) ?? 0)
      case 'stash.push':
        return stashOps.stashPush(cwd, git, p.message as string | undefined, {
          includeUntracked: Boolean(p.includeUntracked),
          includeIgnored: Boolean(p.includeIgnored),
          paths: p.paths as string[] | undefined
        })
      case 'stash.branch':
        return stashOps.stashBranch(
          cwd,
          git,
          p.branchName as string,
          (p.index as number) ?? 0
        )
      case 'stash.pop':
        return stashOps.stashPop(cwd, git, (p.index as number) ?? 0)
      case 'stash.apply':
        return stashOps.stashApply(cwd, git, (p.index as number) ?? 0)
      case 'stash.drop':
        return stashOps.stashDrop(cwd, git, (p.index as number) ?? 0)
      case 'worktree.list':
        return worktreeOps.worktreeList(cwd, git)
      case 'worktree.add':
        return worktreeOps.worktreeAdd(cwd, git, {
          path: p.path as string,
          branch: p.branch as string | undefined,
          newBranch: p.newBranch as string | undefined,
          detach: Boolean(p.detach),
          commit: p.commit as string | undefined
        })
      case 'worktree.remove': {
        const removePath = normalizeRepoPath(p.path as string)
        await worktreeOps.worktreeRemove(cwd, git, removePath, Boolean(p.force))
        if (this.repos.has(removePath)) {
          await this.disconnectRepo(removePath)
        }
        return
      }
      case 'worktree.prune':
        return worktreeOps.worktreePrune(cwd, git)
      case 'submodule.list':
        return submoduleOps.submoduleList(cwd, git)
      case 'submodule.add':
        return submoduleOps.submoduleAdd(cwd, git, {
          url: p.url as string,
          path: p.path as string,
          branch: p.branch as string | undefined
        })
      case 'submodule.init':
        return submoduleOps.submoduleInit(
          cwd,
          git,
          p.paths as string[] | undefined,
          Boolean(p.recursive)
        )
      case 'submodule.update':
        return submoduleOps.submoduleUpdate(cwd, git, {
          paths: p.paths as string[] | undefined,
          init: Boolean(p.init),
          recursive: Boolean(p.recursive),
          remote: Boolean(p.remote),
          merge: Boolean(p.merge),
          rebase: Boolean(p.rebase)
        })
      case 'submodule.sync':
        return submoduleOps.submoduleSync(
          cwd,
          git,
          p.paths as string[] | undefined,
          Boolean(p.recursive)
        )
      case 'submodule.deinit': {
        const deinitPath = normalizeRepoPath(resolve(cwd, p.path as string))
        await submoduleOps.submoduleDeinit(cwd, git, p.path as string, Boolean(p.force))
        if (this.repos.has(deinitPath)) {
          await this.disconnectRepo(deinitPath)
        }
        return
      }
      case 'submodule.remove': {
        const removePath = normalizeRepoPath(resolve(cwd, p.path as string))
        await submoduleOps.submoduleRemove(cwd, git, p.path as string, Boolean(p.force))
        if (this.repos.has(removePath)) {
          await this.disconnectRepo(removePath)
        }
        return
      }
      case 'submodule.setUrl':
        return submoduleOps.submoduleSetUrl(cwd, git, p.path as string, p.url as string)
      case 'merge.status':
        return mergeOps.mergeStatus(cwd, git)
      case 'merge.start':
        return mergeOps.mergeStart(cwd, git, p.branch as string, {
          noFf: Boolean(p.noFf),
          squash: Boolean(p.squash)
        })
      case 'merge.abort':
        return mergeOps.mergeAbort(cwd, git)
      case 'merge.continue':
        return mergeOps.mergeContinue(cwd, git, p.message as string | undefined)
      case 'rebase.start':
        return rebaseOps.rebaseStart(
          cwd,
          git,
          p.onto as string,
          p.from as string | undefined
        )
      case 'rebase.interactive':
        return rebaseOps.rebaseInteractive(
          cwd,
          git,
          p.baseHash as string,
          p.todoLines as string[]
        )
      case 'rebase.abort':
        return rebaseOps.rebaseAbort(cwd, git)
      case 'rebase.continue':
        return rebaseOps.rebaseContinue(cwd, git, p.message as string | undefined)
      case 'rebase.skip':
        return rebaseOps.rebaseSkip(cwd, git)
      case 'cherry-pick.continue':
        return rebaseOps.cherryPickContinue(cwd, git, p.message as string | undefined)
      case 'cherry-pick.abort':
        return rebaseOps.cherryPickAbort(cwd, git)
      case 'cherry-pick.skip':
        return rebaseOps.cherryPickSkip(cwd, git)
      case 'cherry-pick':
        if (Array.isArray(p.hashes) && p.hashes.length > 0) {
          return rebaseOps.cherryPickMultiple(
            cwd,
            git,
            p.hashes as string[],
            Boolean(p.noCommit),
            typeof p.mainline === 'number' ? p.mainline : undefined
          )
        }
        return rebaseOps.cherryPick(
          cwd,
          git,
          p.hash as string,
          Boolean(p.noCommit),
          typeof p.mainline === 'number' ? p.mainline : undefined
        )
      case 'rebase.squash':
        return rebaseOps.rebaseSquash(cwd, git, p.hashes as string[])
      case 'rebase.drop':
        return rebaseOps.rebaseDrop(cwd, git, p.hashes as string[])
      case 'commit.revert':
        return rebaseOps.revertCommit(
          cwd,
          git,
          p.hash as string,
          typeof p.mainline === 'number' ? p.mainline : undefined
        )
      case 'reset':
        return rebaseOps.resetRepo(cwd, git, p.mode as 'soft' | 'mixed' | 'hard', p.ref as string | undefined)
      case 'reset.head':
        return rebaseOps.resetToParent(cwd, git, p.mode as 'soft' | 'mixed' | 'hard')
      case 'maintenance.unreachable':
        return maintenanceOps.listUnreachableCommits(cwd, git)
      case 'maintenance.staleBranches': {
        const hashes = Array.isArray(p.hashes)
          ? (p.hashes as string[])
          : typeof p.hash === 'string' && p.hash
            ? [p.hash]
            : []
        return maintenanceOps.listStaleLocalBranches(cwd, git, hashes)
      }
      case 'maintenance.removeStaleBranches':
        return maintenanceOps.removeStaleRefs(
          cwd,
          git,
          Array.isArray(p.refs) && p.refs.length > 0
            ? (p.refs as string[])
            : ((p.branchNames as string[]) ?? []).map((name) =>
                name.startsWith('refs/') ? name : `refs/heads/${name}`
              )
        )
      case 'maintenance.prune':
        return maintenanceOps.pruneStaleObjects(cwd, git)
      default:
        throw new Error(`Unknown git method: ${method}`)
    }
  }
}
