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
| `repo.status` | `branch.checkout`, `branch.create`, `branch.delete` |
| `log.graph`, `log.show` | `stage.add`, `stage.reset`, `commit.create`, `commit.revert` |
| `branch.list` | `merge.start`, `merge.abort`, `merge.continue` |
| `remote.list` | `remote.add`, `remote.remove` |
| `diff.working`, `diff.staged`, `diff.commits` | `fetch`, `push`, `pull` |
| `stash.list`, `stash.show` | `stash.push`, `stash.pop`, `stash.apply`, `stash.drop` |
| `merge.status` | `rebase.start`, `rebase.abort`, `rebase.continue`, `rebase.drop`, `cherry-pick`, `reset`, `reset.head` |
| `maintenance.unreachable`, `maintenance.staleBranches` | `maintenance.prune`, `maintenance.removeStaleBranches` |

Workspace helpers: `connect`, `switchWorkspace`, `cloneRepository`, `openWorkspace`, settings.

## UI layout

```
┌─────────────────────────────────────────────────────────┐
│ Tabs · path · ActionBar (commit/stash/fetch/pull/push)  │
├──────────┬──────────────────────────────┬───────────────┤
│ Branches │ Commit graph + diff overlay  │ Detail panel  │
│ Stash    │                              │ (commit/WIP)  │
│ Remotes  │                              │               │
└──────────┴──────────────────────────────┴───────────────┘
```

## Git backend

- `electron/git/git-runner.ts` — spawn `git` with `cwd = repo`
- `electron/git/repo-manager.ts` — per-tab repo pool + `invoke` dispatch
- `electron/git/operations/*` — domain modules (branch, log, diff, remote, stash, merge, rebase)

No third-party git libraries; output is parsed from porcelain/plumbing commands.
