# Everyday Git

Stage changes, commit, push, pull, and view diffs — the core daily workflow.

## Open a repository

From the workspace hub, choose **Open a folder** and select a directory with a `.git` folder. The main layout appears:

```
┌──────────┬──────────────────────────────┬───────────────┐
│ Sidebar  │ Commit timeline + diffs      │ Detail panel  │
│ Branches │                              │               │
│ Changes  │                              │               │
└──────────┴──────────────────────────────┴───────────────┘
```

## Working tree (changes panel)

The left sidebar lists **Unstaged** and **Staged** files.

| Action | How |
|--------|-----|
| Stage file | Click **+** next to the file |
| Stage folder | Right-click folder → stage |
| Stage hunk | Open diff → stage selected lines |
| Unstage | Click **−** on a staged file |
| Discard | Right-click → discard changes |
| Rename | Right-click → rename |

## Commit

1. Stage the files you want to include
2. Enter a commit message in the **Commit** panel (bottom of sidebar or detail area)
3. Optional: check **Amend** to amend the previous commit
4. Optional: check **Sign** for GPG signing (requires `commit.gpgsign` in config)
5. Click **Commit**

Use the **star** button or **Ctrl+Shift+Space** to generate a message with [AI assist](../setup/ai-assistant.md).

## View diffs

Click a changed file to open the **diff overlay** in the center panel.

- Switch between unified, side-by-side, and word diff modes
- View **blame** annotations on the current version
- Stage or unstage hunks from within the diff

## Sync with remote

Use the **action bar** at the top:

| Button | Action |
|--------|--------|
| Fetch | `git fetch` (with tags) |
| Pull | `git pull` (or `--rebase` if enabled in settings) |
| Push | `git push` to the default remote |

## Detail panel

Select a commit in the timeline to see its message, files, and diff in the right **detail panel**.

## Next

[Branching and merging](02-branching-and-merging.md) — create branches and merge work
