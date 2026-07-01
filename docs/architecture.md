# GitFreddo Architecture

GitFreddo is an Electron desktop client that runs `git` subprocesses in the main process and exposes a typed IPC API to the React renderer.

## Layers

| Layer | Role |
|-------|------|
| **Main** (`electron/main`) | IPC handlers, repo manager, git operations |
| **Preload** | `window.gitfredo` via `contextBridge` |
| **Renderer** (`src/`) | React UI, TanStack Query, Zustand |

## IPC API

The renderer calls `window.gitfredo.invoke(method, params)` for git operations:

| Read | Write |
|------|-------|
| `repo.status` | `branch.checkout`, `branch.create`, `branch.delete`, `branch.rename` |
| `log.graph`, `log.show`, `log.message` | `stage.add`, `stage.reset`, `commit.create`, `commit.reword`, `commit.revert` |
| `branch.list`, `tag.list` | `tag.create`, `tag.delete`, `tag.push` |
| `working.status`, `working.cleanPreview` | `working.discard`, `working.remove`, `working.clean` |
| `remote.list` | `remote.add`, `remote.remove`, `fetch`, `push`, `pull` |
| `diff.working`, `diff.staged`, `diff.commits`, `diff.show` | `stash.push`, `stash.pop`, `stash.apply`, `stash.drop` |
| `stash.list`, `stash.show`, `stash.files` | `merge.start`, `merge.abort`, `merge.continue` |
| `worktree.list` | `worktree.add`, `worktree.remove`, `worktree.prune` |
| `merge.status` (returns `kind`: merge \| rebase \| cherry-pick) | `rebase.start`, `rebase.abort`, `rebase.continue`, `rebase.skip`, `rebase.squash`, `rebase.drop` |
| `maintenance.unreachable`, `maintenance.staleBranches` | `cherry-pick`, `cherry-pick.continue`, `cherry-pick.abort`, `cherry-pick.skip` |
| `file.read` | `reset`, `reset.head`, `maintenance.prune`, `maintenance.removeStaleBranches` |

Workspace helpers: `connect`, `switchWorkspace`, `cloneRepository`, `openWorkspace`, `deleteWorkspaceFile`, `openInEditor`, settings.

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
