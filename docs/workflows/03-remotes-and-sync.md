# Remotes and sync

Manage remotes, fetch updates, push commits, and work with remote branches.

## Action bar

| Button | Git command | Notes |
|--------|-------------|-------|
| Fetch | `git fetch --tags` | Updates remote-tracking branches |
| Pull | `git pull` or `git pull --rebase` | Uses rebase if enabled in settings |
| Push | `git push` | Pushes current branch to upstream |

## Remotes section

The sidebar **Remotes** section lists configured remotes and their URLs.

### Add a remote

1. Click **+** in the Remotes section
2. Enter remote name (e.g. `origin`) and URL
3. Confirm

### Edit or remove

Right-click a remote:

- **Edit URL** — change the fetch/push URL
- **Rename** — rename the remote
- **Remove** — delete the remote configuration

## Remote branches

Under each remote, remote-tracking branches are listed (e.g. `origin/feature`).

| Action | How |
|--------|-----|
| Checkout as local branch | Right-click → checkout creates a tracking branch |
| Delete on remote | Right-click → delete (runs `git push remote --delete`) |

## Force push

When a normal push is rejected, GitFreddo may offer **Force push** with a confirmation dialog. Use only when you intend to rewrite remote history.

## Default remote

Set the default remote name under **Settings → Git** (usually `origin`). Used by push, pull, and upstream operations.

## GitHub authentication

For GitHub HTTPS remotes, connect your account under [GitHub integration](../setup/github.md) to avoid repeated credential prompts.

## Next

[Stash and cleanup](04-stash-and-cleanup.md) — stash changes and clean untracked files
