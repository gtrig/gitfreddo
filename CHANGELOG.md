# Changelog

All notable changes to GitFreddo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Session notes for commits/PRs go under `[Unreleased]` until a git tag cuts a release section (`## [X.Y.Z]` ↔ tag `vX.Y.Z`).

## [Unreleased]

### 2026-07-09 — Selective AI commit creation

- **Why:** Users may want only some of the AI-proposed commits, leaving the rest unstaged for re-analysis or manual commits.
- **What:** AI change analysis adds per-commit checkboxes; create only stages and commits selected proposals; unselected files stay unstaged (`AnalyzeChangesWithAi.tsx`, locales, tests).

### 2026-07-09 — Live theme preview in Settings

- **Why:** Users should see a color scheme immediately when picking it in Settings, without saving first.
- **What:** Theme dropdown previews via `setDocumentTheme` while the modal is open; cancel restores the saved theme; save persists through `setSettings` and `applyTheme` (`SettingsModal`, `themes.ts`).

### 2026-07-09 — Coffee-themed color schemes

- **Why:** Theme names should match GitFreddo’s coffee identity and be easier to browse in Settings.
- **What:** Renamed all 11 themes to coffee drink names — dark: Black, Freddo, Americano, Matcha, Mocha, Caramel; light: Iced Latte, Iced Americano, Iced Vanilla, Iced Matcha, Iced Caramel. Legacy theme ids (`dark`, `paper`, `mint`, etc.) migrate automatically on load.

### 2026-07-09 — Graph drag-to-select commits

- **Why:** Users expect to select a range of commits by clicking and dragging in the commit graph, like other git clients.
- **What:** Pointer drag across any timeline column selects contiguous commits (reuses shift-range selection); auto-scrolls near viewport edges; ref badges stay interactive (`useTimelineDragSelect`, `TimelineDragSelectOverlay`, `timelinePointerSelection`). Fixed click offset that selected the row below by mapping pointer Y to the overlay element instead of the scroll container (which includes the sticky header).

### 2026-07-09 — Header branding

- **Why:** Reinforce GitFreddo identity in the main chrome while a repository is open.
- **What:** Left brand rail spanning workspace tabs and the header bar (`AppBrandRail`, `src/App.tsx`).

### 2026-07-09 — Parallel e2e Electron launches

- **Why:** Playwright runs e2e specs with multiple workers; only the first Electron instance acquired the desktop single-instance lock and the rest exited immediately.
- **What:** Set `GITFREDDO_E2E=1` in the Playwright launcher and skip `requestSingleInstanceLock` in that mode (`e2e/helpers.ts`, `electron/main/index.ts`).

### 2026-07-09 — Honor external editor command

- **Why:** **Open in editor** always used the OS default app and ignored the optional command in Settings → Interface.
- **What:** `gitfreddo:open-in-editor` now spawns the configured editor (e.g. `code --wait`) when set; falls back to `shell.openPath` when unset (`electron/open-in-editor.ts`).

### 2026-07-09 — Reorderable workspace tabs

- **Why:** Users wanted to arrange open repository tabs in a preferred order.
- **What:** Drag-and-drop reordering on workspace tab labels; order persists via existing session settings (`reorderTabPaths`, `reorderWorkspaceTabs`, `WorkspaceTabs`).

### 2026-07-09 — Reliable settings persistence

- **Why:** Recent projects and open tabs could reset when multiple app instances ran or settings saves raced each other.
- **What:** Serialized settings writes with atomic file replace; connect saves only `recentRepos`; Settings modal no longer overwrites session tabs/recents; single-instance lock focuses an existing window instead of starting a second copy.

### 2026-07-08 — Full-page commit detail view

- **Why:** Reviewing a commit's files and diffs in the narrow right sidebar was cramped; users also wanted to browse every file at that revision, not only changed paths.
- **What:** Full-screen commit detail (`CommitDetailScreen`) with left file sidebar and diff pane; shared `CommitFileList` with path/tree toggle and **Show all files** (`log.tree` IPC + merge with name-status); expand button on the right-sidebar commit preview; **Full file** view mode in commit detail and file history overlays; **Open in editor** button on all file/diff view toolbars (`OpenInEditorButton`).

### 2026-07-08 — GitHub OAuth workflow scope

- **Why:** HTTPS push rejected updates to `.github/workflows/*` because the device-flow token lacked `workflow`.
- **What:** Request `workflow` alongside `repo` and `admin:public_key` in GitHub device OAuth; document reconnect for workflow pushes.

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
