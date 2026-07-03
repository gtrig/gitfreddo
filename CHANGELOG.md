# Changelog

All notable changes to GitFreddo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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

[0.2.0]: https://github.com/gtrig/gitfreddo/releases/tag/v0.2.0
