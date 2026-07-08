# Changelog

All notable changes to GitFreddo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Session notes for commits/PRs go under `[Unreleased]` until a git tag cuts a release section (`## [X.Y.Z]` ↔ tag `vX.Y.Z`).

## [Unreleased]

## [0.3.4] - 2026-07-08

### Added

- Startup modal news loaded from root `NEWS.md` (tag sections)
- Project `.env` loading in Electron main for local forge OAuth configuration
- Release builds bake forge OAuth client credentials from GitHub Actions secrets into the main bundle (`GITFREDDO_GITHUB_CLIENT_ID`, `BITBUCKET_CLIENT_ID`, `BITBUCKET_CLIENT_SECRET`)
- macOS `.dmg` installer via GitHub Actions release workflow

### Fixed

- GitHub OAuth device flow now requests `admin:public_key` so Upload SSH key works
- Bitbucket Upload SSH key blocked on OAuth with clear guidance (API requires app password / API token)

### Changed

- Cursor session logging targets `CHANGELOG.md` / `NEWS.md` by git tag sections

## [0.2.0] - 2026

### Added

- Visual commit timeline graph with history rewriting (rebase, interactive rebase, squash, drop, cherry-pick, revert, reset)
- Multi-tab repositories with session persistence
- Git worktrees: list, add (including from commit hash), remove, prune; open in tab
- Branch operations: checkout, create, rename, delete, merge (no-ff / squash), upstream tracking
- Remote branches: checkout as local tracking branch, delete on remote
- Remotes: fetch (with tags), push, pull (with rebase option), add, remove, rename, edit URL
- Working tree: stage, unstage, hunk staging, folder staging, commit, amend, GPG sign
- Diff viewer: unified, side-by-side, word diff, blame annotations
- Built-in 3-way conflict resolver with AI-assisted resolution
- Stash: push (with options), pop, apply, drop, stash branch, diff preview
- Tags: create, rename, delete, push
- Inspection tools: commit search, pickaxe search, reflog, bisect wizard, file history, git notes
- Repository maintenance: unreachable commits, stale refs, prune
- GitHub integration: OAuth/PAT, PRs, issues, repo browse/create/fork, SSH key upload
- AI assist for commit/stash messages and conflict resolution (local LLM or cloud API)
- 11 themes, configurable poll interval, external editor command
- Git config editor and `.gitignore` / `.gitattributes` editor
- Linux (AppImage, deb) and Windows (NSIS) installers via GitHub Actions

[0.3.4]: https://github.com/gtrig/gitfreddo/releases/tag/v0.3.4
[0.2.0]: https://github.com/gtrig/gitfreddo/releases/tag/v0.2.0
