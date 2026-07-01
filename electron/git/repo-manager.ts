import { emitLog } from './log-bus'
import { normalizeRepoPath, hasGitDir } from './repo-path'
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
      throw new Error('No .git directory found. Open a folder initialized as a git repository.')
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
      case 'tag.list':
        return tagOps.tagList(cwd, git)
      case 'tag.create':
        return tagOps.tagCreate(
          cwd,
          git,
          p.name as string,
          p.target as string | undefined,
          p.message as string | undefined
        )
      case 'tag.delete':
        return tagOps.tagDelete(
          cwd,
          git,
          p.name as string,
          p.remote as string | undefined
        )
      case 'tag.push':
        return tagOps.tagPush(cwd, git, p.name as string | undefined, p.remote as string | undefined)
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
        return statusOps.commitCreate(cwd, git, p.message as string, Boolean(p.amend))
      case 'commit.reword':
        return rebaseOps.rebaseReword(cwd, git, p.hash as string, p.message as string)
      case 'diff.working':
        return diffOps.diffWorking(cwd, git, p.path as string | undefined)
      case 'diff.staged':
        return diffOps.diffStaged(cwd, git, p.path as string | undefined)
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
      case 'remote.list':
        return remoteOps.remoteList(cwd, git)
      case 'remote.add':
        return remoteOps.remoteAdd(cwd, git, p.name as string, p.url as string)
      case 'remote.remove':
        return remoteOps.remoteRemove(cwd, git, p.name as string)
      case 'fetch':
        return remoteOps.fetchRemote(cwd, git, p.remote as string | undefined)
      case 'push':
        return remoteOps.pushRemote(
          cwd,
          git,
          p.remote as string | undefined,
          p.branch as string | undefined,
          Boolean(p.setUpstream)
        )
      case 'pull':
        return remoteOps.pullRemote(
          cwd,
          git,
          p.remote as string | undefined,
          p.branch as string | undefined
        )
      case 'stash.list':
        return stashOps.stashList(cwd, git)
      case 'stash.show':
        return stashOps.stashShow(cwd, git, (p.index as number) ?? 0, p.path as string | undefined)
      case 'stash.files':
        return stashOps.stashFiles(cwd, git, (p.index as number) ?? 0)
      case 'stash.push':
        return stashOps.stashPush(cwd, git, p.message as string | undefined)
      case 'stash.pop':
        return stashOps.stashPop(cwd, git, (p.index as number) ?? 0)
      case 'stash.apply':
        return stashOps.stashApply(cwd, git, (p.index as number) ?? 0)
      case 'stash.drop':
        return stashOps.stashDrop(cwd, git, (p.index as number) ?? 0)
      case 'merge.status':
        return mergeOps.mergeStatus(cwd, git)
      case 'merge.start':
        return mergeOps.mergeStart(cwd, git, p.branch as string)
      case 'merge.abort':
        return mergeOps.mergeAbort(cwd, git)
      case 'merge.continue':
        return mergeOps.mergeContinue(cwd, git)
      case 'rebase.start':
        return rebaseOps.rebaseStart(cwd, git, p.onto as string)
      case 'rebase.abort':
        return rebaseOps.rebaseAbort(cwd, git)
      case 'rebase.continue':
        return rebaseOps.rebaseContinue(cwd, git)
      case 'rebase.skip':
        return rebaseOps.rebaseSkip(cwd, git)
      case 'cherry-pick.continue':
        return rebaseOps.cherryPickContinue(cwd, git)
      case 'cherry-pick.abort':
        return rebaseOps.cherryPickAbort(cwd, git)
      case 'cherry-pick.skip':
        return rebaseOps.cherryPickSkip(cwd, git)
      case 'cherry-pick':
        if (Array.isArray(p.hashes) && p.hashes.length > 0) {
          return rebaseOps.cherryPickMultiple(cwd, git, p.hashes as string[])
        }
        return rebaseOps.cherryPick(cwd, git, p.hash as string)
      case 'rebase.squash':
        return rebaseOps.rebaseSquash(cwd, git, p.hashes as string[])
      case 'rebase.drop':
        return rebaseOps.rebaseDrop(cwd, git, p.hashes as string[])
      case 'commit.revert':
        return rebaseOps.revertCommit(cwd, git, p.hash as string)
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
