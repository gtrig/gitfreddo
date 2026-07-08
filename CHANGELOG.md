# Changelog

All notable changes to GitFreddo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Session notes for commits/PRs go under `[Unreleased]` until a git tag cuts a release section (`## [X.Y.Z]` ↔ tag `vX.Y.Z`).

## [Unreleased]

### 2026-07-08 — Bake forge OAuth credentials into release builds

- **Why:** Local `.env` is not present in CI or installers; Actions also forbids secrets named `GITHUB_*`.
- **What:** Release workflow maps `GITFREDDO_GITHUB_CLIENT_ID` / Bitbucket secrets into build env; electron-vite bakes them into main via `GITFREDDO_BUILD_*` defines; runtime `.env` still wins locally.

### 2026-07-08 — Bitbucket SSH upload requires app password

- **Why:** Bitbucket SSH keys API rejects OAuth (`403` … only session/password/apppassword); Upload SSH key failed after OAuth connect.
- **What:** Guard `uploadBitbucketSshKey` for non–app-password auth; disable Upload SSH in UI when on OAuth with guidance; docs updated.

### 2026-07-08 — GitHub OAuth scope for SSH key upload

- **Why:** Upload SSH key returned GitHub API 404 after OAuth; device flow only requested `repo`, which cannot call `POST /user/keys`.
- **What:** Request `repo admin:public_key` in GitHub device OAuth; document reconnect and PAT scope for SSH upload.

### 2026-07-08 — Load project .env in Electron main

- **Why:** `GITHUB_CLIENT_ID` in `.env` was ignored; electron-vite only exposes `VITE_`/`MAIN_VITE_` via `import.meta.env`, so connect failed with “not configured”.
- **What:** Added `electron/load-dotenv.ts` and call `loadDotEnvFile()` at main startup; clarified `.env.example` and GitHub setup docs.

### 2026-07-08 — Startup NEWS.md + session logs

- **Why:** Startup modal should load user-facing news from a root file; agents should also keep changelog session notes for commits/PRs.
- **What:** Added `NEWS.md` (tag sections) with parser/`getStartupNewsItems`; wired `StartupModal` to it; extended `.cursor/rules/changes-log.mdc` for `CHANGELOG.md` + `NEWS.md`; removed i18n-hardcoded news bullets.

### 2026-07-08 — Session changelog rule (by git tag)

- **Why:** Improve commit messages and PR descriptions with a running session log, separated by release tags.
- **What:** Always-apply Cursor rule `.cursor/rules/changes-log.mdc` now targets `CHANGELOG.md`; removed temporary `CHANGES.md`; new work is logged under `[Unreleased]` and moved into version sections when a `vX.Y.Z` tag is cut.

### Added

- macOS `.dmg` installer via GitHub Actions release workflow

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
