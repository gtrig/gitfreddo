# History rewriting

Rebase, interactive rebase, squash, drop, reword, cherry-pick, revert, and reset from the commit timeline.

## Timeline context menu

Right-click a commit in the **commit timeline** to access history operations. Multi-select commits (Ctrl/Cmd+click) for batch operations.

## Rebase

**Rebase onto** — replay commits from the selected commit onto another branch or commit.

1. Right-click a commit → **Rebase onto…**
2. Select the new base
3. Resolve any conflicts (see [Conflicts](08-conflicts.md))
4. Continue or abort from the conflict panel

## Interactive rebase

1. Select one or more commits
2. Right-click → **Interactive rebase** or **Edit rebase sequence**
3. Reorder, squash, drop, or reword commits in the sequence modal
4. GitFreddo runs the rebase; resolve conflicts as they appear

### Supported operations

| Operation | Description |
|-----------|-------------|
| Squash | Combine commits into one |
| Drop | Remove a commit from history |
| Reword | Change commit message |
| Cherry-pick | Apply a commit onto current branch |
| Revert | Create a revert commit |

### Limitations

**Merge commits** cannot be reworded, squashed, reverted, or dropped. GitFreddo disables these actions for merge commits and shows an error if attempted.

## Cherry-pick

Right-click a commit → **Cherry-pick** to apply its changes on the current branch. Use **Cherry-pick without committing** (`-n`) to stage without committing.

## Revert

Right-click a commit → **Revert** to create a new commit that undoes its changes.

## Reset

Right-click a commit → **Reset current branch to here**:

- **Soft** — move HEAD, keep changes staged
- **Mixed** — move HEAD, unstage changes
- **Hard** — move HEAD, discard all changes (destructive)

## Requirements

- Working tree must be **clean** before most rewrite operations
- Finish or abort any in-progress merge/rebase/cherry-pick first

## Next

[Worktrees](06-worktrees.md) — work on multiple branches in separate directories
