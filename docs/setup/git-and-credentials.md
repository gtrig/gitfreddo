# Git and credentials

Configure how GitFreddo invokes git and per-repository settings.

Open **Settings → Git** to configure.

## Git binary path

By default GitFreddo uses `git` from your PATH. To use a specific binary:

1. Enter the full path in **git binary path**, or click **Browse**
2. Settings are saved immediately

Override via environment:

```bash
GIT_BINARY=/usr/bin/git
```

## Default remote

Set the remote name used for push, pull, and upstream operations. Default is `origin`.

## Pull mode

Choose how the action bar **Pull** runs:

- **Merge** — `git pull` (default)
- **Rebase** — `git pull --rebase`
- **Fast-forward only** — `git pull --ff-only` (fails if histories diverge)

Existing installs that had **Pull with rebase** enabled migrate to Rebase mode.

## Repository config (when a repo is open)

With a repository connected, the Git settings panel shows local config keys:

| Key | Purpose |
|-----|---------|
| `user.name` | Commit author name |
| `user.email` | Commit author email |
| `commit.gpgsign` | Sign commits with GPG (`true` / `false`) |
| `pull.rebase` | Per-repo pull rebase setting |
| `init.defaultBranch` | Default branch name for `git init` |

Edit a value and click **Save** to write to the repository's local config.

## External editor

Set the **External editor command** under **Settings → Interface** (e.g. `code --wait`). GitFreddo uses this when opening files for editing.

## Repository files

The Git settings panel also links to edit:

- `.gitignore`
- `.gitattributes`

These open in the in-app editor when a repository is connected.

## Git hooks

With a repository connected, the **Git hooks** section lists hook scripts in the repository hooks directory. By default this is `.git/hooks/`; if `core.hooksPath` is set (local or global config), that directory is used instead.

You can:

- View and edit hook script content
- **Enable** a hook (activates a `.sample` hook or re-enables a `.disabled` hook)
- **Disable** an active hook (renames it to `.disabled`)
- **Delete** a hook and all its variants

Hooks run automatically when GitFreddo performs the corresponding git operations (commit, push, etc.).

Git hooks live in each repository's own hooks directory (`.git/hooks/` by default) and are **not** version-controlled. GitFreddo manages them per workspace from this panel rather than shipping hooks in the repository.

## Next

- [Interface and themes](interface-and-themes.md) — themes, poll interval, diff defaults
- [Remotes and sync](../workflows/03-remotes-and-sync.md) — push and pull
