# Inspection tools

Search history, trace changes, recover lost commits, bisect regressions, and annotate commits with notes.

## Commit search

Use the **search box** above the commit timeline to filter commits by message. Results highlight in the graph.

## Pickaxe search

**Tools → Pickaxe search** (or header tools menu):

1. Enter a string to find commits that added or removed that text
2. Runs `git log -S` / pickaxe search
3. Click a result to jump to the commit in the timeline

## Reflog

**Tools → Reflog**:

- Browse the reference log (`git reflog`)
- Recover "lost" commits after reset or rebase
- Click an entry to view the commit

## Bisect

**Tools → Bisect** opens the bisect wizard:

1. **Start** bisect on a known good and bad commit
2. Check out each midpoint and mark **Good** or **Bad**
3. GitFreddo narrows to the introducing commit
4. **Reset** when done to end the bisect session

## File history

Right-click a file in the working tree or commit file list → **File history**:

- Shows all commits that touched the file
- Click a commit to view its diff for that file

## Git notes

Add annotations to commits without changing history:

1. Select a commit
2. Use the notes action in the detail panel or context menu
3. Notes are stored in `refs/notes/commits`

## Log drawer

Open the **log drawer** (bottom panel) to see git command output and app messages. Useful for debugging failed operations.

## Next

[Conflicts](08-conflicts.md) — resolve merge and rebase conflicts
