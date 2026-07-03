# Worktrees

Work on multiple branches simultaneously using git worktrees — separate working directories linked to the same repository.

## Worktrees section

The **Worktrees** section in the sidebar lists all worktrees for the current repository.

## Add a worktree

1. Click **+** in the Worktrees section
2. Choose:
   - **Branch** — create from an existing branch
   - **Commit** — detach at a specific commit hash
   - **New branch** — create a new branch at a starting point
3. Enter the path (or accept the default)
4. Confirm

## Open in tab

Right-click a worktree → **Open in tab** to open that directory as a new GitFreddo tab.

## Checkout in new worktree

From the branch list, right-click a branch → **Checkout in new worktree** to check out that branch in a fresh directory without switching your current tab.

## Remove and prune

| Action | Description |
|--------|-------------|
| Remove | Delete a worktree (`git worktree remove`) |
| Prune | Remove stale worktree metadata (`git worktree prune`) |

Removing a worktree does not delete the branch — only the extra working directory.

## Use cases

- Review a PR branch while keeping your feature branch checked out
- Run tests on `main` without stashing feature work
- Compare builds across branches side by side

## Next

[Inspection tools](07-inspection-tools.md) — search, reflog, bisect, and file history
