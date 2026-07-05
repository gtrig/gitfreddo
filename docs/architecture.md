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
| `repo.status` | `branch.checkout`, `branch.checkoutRemote`, `branch.create`, `branch.delete`, `branch.rename`, `branch.setUpstream`, `branch.unsetUpstream`, `branch.deleteRemote` |
| `log.graph`, `log.show`, `log.message`, `log.file`, `log.pickaxe`, `log.search` | `stage.add`, `stage.reset`, `stage.applyPatch`, `commit.create`, `commit.reword`, `commit.revert` |
| `branch.list`, `tag.list`, `reflog.list` | `tag.create`, `tag.delete`, `tag.push`, `tag.rename` |
| `working.status`, `working.cleanPreview`, `working.read` | `working.discard`, `working.remove`, `working.clean`, `working.write`, `working.rename` |
| `remote.list` | `remote.add`, `remote.remove`, `remote.rename`, `remote.setUrl`, `fetch`, `push`, `pull` |
| `diff.working`, `diff.staged`, `diff.commits`, `diff.show` | `stash.push`, `stash.pop`, `stash.apply`, `stash.drop`, `stash.branch` |
| `stash.list`, `stash.show`, `stash.files` | `merge.start` (no-ff/squash), `merge.abort`, `merge.continue` |
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

- `electron/git/git-runner.ts` — spawn `git` with `cwd = repo`
- `electron/git/repo-manager.ts` — per-tab repo pool + `invoke` dispatch
- `electron/git/operations/*` — domain modules (branch, log, diff, remote, stash, worktree, merge, rebase, status)
- `electron/git/git-dir.ts` — resolve git metadata dir for linked worktrees

No third-party git libraries; output is parsed from porcelain/plumbing commands.
