# Stash and cleanup

Save work in progress with stash, discard changes, remove tracked files, and clean untracked files.

## Stash

### Push (save) a stash

1. Open the **Stash** section in the sidebar, or use the stash button in the action bar
2. Optionally enter a message (AI assist available)
3. Choose options:
   - Include untracked files
   - Include ignored files
   - Stash only specific paths
4. Confirm

### Apply or pop

In the **Stashes** sidebar section:

- **Apply** — restore changes without removing the stash
- **Pop** — apply and remove the stash
- **Drop** — delete the stash without applying

### Stash branch

Right-click a stash → **Create branch from stash** to apply it on a new branch.

### Preview

Click a stash entry to preview its diff in the center panel.

## Discard changes

Right-click a file or folder in the working tree:

- **Discard** — revert unstaged changes to the last commit (`git checkout --`)
- Works per-file, per-folder, or in bulk

## Remove tracked files

Right-click a tracked file → **Remove** runs `git rm` and stages the deletion for the next commit.

## Clean untracked files

1. Click **Clean untracked…** in the working tree panel
2. Review the **dry-run preview** listing files that would be deleted
3. Confirm to run `git clean`

This permanently deletes untracked files. Use stash first if you might need them later.

## Next

[History rewriting](05-history-rewriting.md) — rebase, squash, cherry-pick, and revert
