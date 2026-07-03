# Branching and merging

Create, switch, rename, and delete branches; merge with no-ff or squash; set upstream tracking.

## Branch list

The **Branches** section in the left sidebar shows local and remote-tracking branches. The current branch is marked with a check.

## Create a branch

1. Right-click a commit in the timeline → **Create branch here**, or use the **+** button in the branch section
2. Enter the branch name
3. Optionally check out the new branch immediately

## Checkout

- Click a branch name in the sidebar to check it out
- Right-click → **Checkout** from the timeline ref badge

## Rename or delete

Right-click a local branch:

- **Rename** — enter a new name
- **Delete** — removes the branch (blocked if checked out)

## Merge

1. Check out the target branch (e.g. `main`)
2. Right-click the source branch → **Merge into current branch**
3. Choose merge type:
   - **No-ff** — always creates a merge commit
   - **Squash** — squashes all commits into one

If conflicts occur, see [Conflicts](08-conflicts.md).

## Set upstream

For a local branch without a remote tracking branch:

1. Right-click the branch → **Set upstream**
2. Select the remote branch to track

Pull and push then use the configured upstream automatically.

## Remote branches

Remote branches appear under their remote name (e.g. `origin/main`). See [Remotes and sync](03-remotes-and-sync.md) for checkout and delete on remote.

## Next

[Remotes and sync](03-remotes-and-sync.md) — fetch, push, and manage remotes
