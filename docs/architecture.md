# GitFreddo Architecture

GitFreddo is an Electron desktop client that runs `git` subprocesses in the main process and exposes a typed IPC API to the React renderer.

## Layers

| Layer | Role |
|-------|------|
| **Main** (`electron/main`) | IPC handlers, repo manager, git operations |
| **Preload** | `window.gitfreddo` via `contextBridge` |
| **Renderer** (`src/`) | React UI, TanStack Query, Zustand |

## IPC API

The renderer calls `window.gitfreddo.invoke(method, params)` for git operations:

| Read | Write |
|------|-------|
| `repo.status` | `branch.checkout`, `branch.checkoutRemote`, `branch.create`, `branch.delete`, `branch.rename`, `branch.setUpstream`, `branch.unsetUpstream`, `branch.deleteRemote`, `branch.fastForward` |
| `log.graph`, `log.show`, `log.message`, `log.file`, `log.pickaxe`, `log.search` | `stage.add`, `stage.reset`, `stage.applyPatch`, `commit.create`, `commit.reword`, `commit.revert` |
| `branch.list`, `tag.list`, `reflog.list`, `undo.peek` | `tag.create`, `tag.delete`, `tag.push`, `tag.rename`, `undo.last` |
| `working.status`, `working.cleanPreview`, `working.read` | `working.discard`, `working.remove`, `working.clean`, `working.write`, `working.rename` |
| `remote.list` | `remote.add`, `remote.remove`, `remote.rename`, `remote.setUrl`, `fetch`, `push`, `pull` |
| `diff.working`, `diff.staged`, `diff.commits`, `diff.show` | `stash.push`, `stash.pop`, `stash.apply`, `stash.drop`, `stash.branch` |
| `stash.list`, `stash.show`, `stash.files` | `merge.start` (no-ff/squash/ff-only), `merge.abort`, `merge.continue` |
| `worktree.list`, `file.read`, `file.blame`, `file.readStage` | `worktree.add`, `worktree.remove`, `worktree.prune` |
| `submodule.list` | `submodule.add`, `submodule.init`, `submodule.update`, `submodule.sync`, `submodule.deinit`, `submodule.remove`, `submodule.setUrl` |
| `merge.status`, `bisect.status`, `notes.list` | `rebase.start` (--onto), `rebase.interactive`, `rebase.abort`, `rebase.continue`, `rebase.skip`, `rebase.squash`, `rebase.drop` |
| `maintenance.unreachable`, `maintenance.staleBranches`, `config.get`, `config.list` | `cherry-pick` (-n), `cherry-pick.continue`, `cherry-pick.abort`, `cherry-pick.skip`, `config.set` |
| | `reset`, `reset.head`, `maintenance.prune`, `maintenance.removeStaleBranches`, `bisect.start`, `bisect.good`, `bisect.bad`, `bisect.reset`, `notes.add` |

Workspace helpers: `connect`, `switchWorkspace`, `cloneRepository`, `openWorkspace`, `deleteWorkspaceFile`, `openInEditor`, settings, **auto-update** (`checkForUpdates`, `downloadUpdate`, `installUpdate`).

## UI layout

```
┌─────────────────────────────────────────────────────────┐
│ Tabs · path · ActionBar (stash/fetch/pull/push)         │
├──────────┬──────────────────────────────┬───────────────┤
│ Branches │ Commit graph + diff overlay  │ Detail panel  │
│ Worktrees│                              │ (commit/WIP)  │
│ Stash    │                              │               │
│ Remotes  │                              │               │
└──────────┴──────────────────────────────┴───────────────┘
```

## Git backend

- `electron/git/git-runner.ts` — spawn `git` with `cwd = repo`; `runCommand()` executes catalog descriptors (exit codes, stdin, config)
- `electron/git/repo-manager.ts` — per-tab repo pool + typed `invoke` dispatch
- `electron/git/operations/*` — domain modules; argv built via `shared/git/commands` builders
- `electron/git/git-dir.ts` — resolve git metadata dir for linked worktrees

No third-party git libraries; output is parsed from porcelain/plumbing commands.

## Forge integrations

GitHub, GitLab, and Bitbucket share infrastructure under `electron/forge/` (encrypted token store factory, OAuth callback server for auth-code flows, HTTP JSON helpers, connection status lifecycle, repo TTL cache, repo-context resolver, SSH key helpers). Provider folders keep API mappers and auth quirks (GitHub device flow + PR review threads, Bitbucket app passwords, GitLab self-hosted host). Shared domain types live in `shared/forge.ts`; renderer forge UI shells live in `src/components/Forge/` with thin per-provider re-exports.

## Command catalog (`shared/git/commands/`)

Single source of truth for every `git` argv the app runs.

| Piece | Role |
|-------|------|
| `_types.ts` | `GitCommandDescriptor`, `defineCommand()` |
| `_common.ts` | Shared helpers (`withPaths`, ref helpers, word-diff flags) |
| Domain modules | `branch.ts`, `log.ts`, `merge-rebase.ts`, `remote.ts`, … — `buildXxxArgs()` + descriptors |
| `registry.ts` | `GIT_COMMAND_REGISTRY` — all descriptors keyed by id |

Operations call `runGitOrThrow(buildXxxArgs(...))` or `runCommand(descriptor, params, …)` when a descriptor declares non-zero `acceptExitCodes` (merge conflicts, fsck, bisect, ancestry checks).

## IPC catalog (`shared/git/ipc/`)

Maps renderer `invoke(method, params)` to git operations and cache invalidation.

| Piece | Role |
|-------|------|
| `params.ts` / `results.ts` | Typed params and return shapes per method |
| `methods.ts` | `GIT_IPC_METHODS` — each method lists `invalidates`, underlying `commands`, optional `settings` |
| `shared/ipc.ts` | `GitFreddoAPI.invoke<M>()` overloads for the renderer |

`useGitMutations` reads `gitIpcInvalidates(method)` instead of hand-maintained query-key lists. `repo-change.ts` derives invalidation suffixes from the IPC catalog.

**Data flow:**

```
Renderer hook → window.gitfreddo.invoke(method, params)
  → preload → main → RepoManager.invoke
  → operations/* → git-runner → git subprocess
       ↑ argv from shared/git/commands
```
