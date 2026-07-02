<p align="center">
  <img src="assets/gitFreddo_thumbnail_150x150.png" alt="GitFreddo" width="128" height="128" />
</p>

# GitFreddo

Desktop git client with commit graph — an Electron + React app that talks to `git` on your PATH.

## Prerequisites

- Node.js 24+
- `git` installed and available on PATH

## Development

```bash
npm install
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Electron with hot reload |
| `npm run build` | Production build to `out/` |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Unit tests (Vitest) |
| `npm run smoke` | Git backend smoke test |
| `npm run dist` | Package installers |

## Features

- Open local repositories or clone from URL
- Multi-tab repositories
- Git worktrees: list, add, remove, prune; open in tab; checkout branch in new worktree
- Branch list with checkout, create, rename, delete, merge (no-ff / squash)
- Remote branches: checkout as local tracking branch, delete on remote
- Branch upstream: set, unset; pull with rebase option
- Remotes: fetch (with tags), push all, rename, edit URL
- Commit timeline graph with history rewriting (rebase, interactive rebase, squash, drop, cherry-pick, revert, reset)
- Working tree: stage, unstage, hunk staging, commit (with GPG sign), amend, rename files
- Diff viewer: unified, side-by-side, word diff, blame annotations
- File history, pickaxe search, reflog browser, bisect wizard, git notes
- Built-in conflict resolver (ours/theirs/both per hunk)
- Stash: push with untracked/ignored/path options, stash branch
- Tags: create, rename, delete, push
- Git config editor and `.gitignore` / `.gitattributes` editor (when repo open)
- Discard changes (per-file, per-folder, or bulk)
- Remove tracked files (`git rm`) and delete untracked files
- Clean untracked files with dry-run preview (`git clean`)
- Diff viewer (working, staged, commit, stash) with side-by-side and word diff modes
- Stash management with diff preview
- Tags: create, delete, push
- Remotes with fetch, pull, push, add, remove
- Merge / rebase / cherry-pick conflict panel with in-app resolver
- Repository maintenance (unreachable commits, stale refs, prune)
- GitHub integration (PRs, issues, repo browse)
- AI assist for commit and stash messages (local LLM or cloud API)

Settings are stored in `~/.config/gitfreddo/settings.json`.

## AI assist

Configure under **Settings → AI assist**:

- **Local LLM** — OpenAI-compatible server (e.g. LM Studio at `http://localhost:1234`, Ollama at `http://localhost:11434`)
- **Cloud API** — Any OpenAI-compatible endpoint with an API key

When configured, text fields show a star button to generate content from staged or working-tree diffs. Use **Ctrl+Shift+Space** while focused to trigger fill.

API keys are stored locally in `~/.config/gitfreddo/settings.json`.

## Architecture

See [docs/architecture.md](docs/architecture.md).
