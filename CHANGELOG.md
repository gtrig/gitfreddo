# Changelog

All notable changes to GitFreddo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Session notes for commits/PRs go under `[Unreleased]` until a git tag cuts a release section (`## [X.Y.Z]` ↔ tag `vX.Y.Z`).

## [Unreleased]

### 2026-07-11 — Strip stale forge askpass env without tokens

- **Why:** Pre-commit hook failed when `GIT_ASKPASS` lingered in the shell after running GitFreddo with forge auth configured.
- **What:** `buildGitEnv()` removes GitFreddo askpass env vars when no GitHub/Bitbucket token is stored; preserves unrelated custom `GIT_ASKPASS` paths.

### 2026-07-11 — Pre-commit typecheck and test hook

- **Why:** Catch type errors and failing tests before commits land locally.
- **What:** `scripts/hooks/pre-commit` runs `npm run typecheck` and `npm run test`; `setup-git-hooks.sh` now installs every hook under `scripts/hooks/`.

### 2026-07-11 — Theme-aware checkbox styling

- **Why:** Native checkboxes used OS-default colors and inconsistent borders instead of the active theme palette.
- **What:** Shared `Checkbox` component and `.gf-checkbox` CSS tokens (`gf-accent`, `gf-border-strong`, `gf-bg`); applied across settings, modals, AI selection, and conflict merge UI.

### 2026-07-11 — Hook execution output in operation overlay

- **Why:** Users could not see hook script output during commit/push and only got a blocking spinner.
- **What:** Stream hook output into the global operation overlay; toast when a hook passes or fails (replacing duplicate generic push errors when a hook blocks the operation).

### 2026-07-11 — Git hook failures in application log

- **Why:** When a hook blocks commit or push, users need a clear record in the App log without enabling Git log listening.
- **What:** Detect failed hooks from git trace/output in `git-runner` and emit an `app` log entry with hook name and script output.

### 2026-07-11 — Pre-push hook in default .git/hooks

- **Why:** Use Git's standard hooks directory instead of a custom `.githooks/` folder and `core.hooksPath` override.
- **What:** Hook source lives in `scripts/hooks/pre-push`; `scripts/setup-git-hooks.sh` installs it to `.git/hooks/pre-push` and clears `core.hooksPath`; removed `.githooks/`.

### 2026-07-11 — Git hooks path detection

- **Why:** Hooks in `.githooks/` were invisible when `core.hooksPath` was not configured (GitFreddo reads the same directory Git uses).
- **What:** Resolve hooks directory via `git rev-parse --git-path hooks`; detect unused `.githooks/` and offer a one-click `core.hooksPath` setup in Settings → Workspace.

### 2026-07-11 — Settings Workspace tab

- **Why:** Repository-specific settings (local config, repo files, hooks) belong separately from global Git preferences.
- **What:** New Settings → Workspace tab with local git config, `.gitignore` / `.gitattributes` / `.gitmodules` editor, and git hooks; Git tab keeps app-wide git options only.

### 2026-07-11 — Release prepare script and tag pre-push hook

- **Why:** `package.json` drifted from git release tags; tag pushes should require a matching version bump first.
- **What:** `npm run release:prepare -- vX.Y.Z` syncs version files and prints release steps; `scripts/hooks/pre-push` validates `v*` tags against `package.json` (installed to `.git/hooks/` via `npm install`).

### 2026-07-11 — Documentation sidebar search

- **Why:** Users need to find in-app help topics quickly without scanning every section.
- **What:** Search field atop the Documentation modal sidebar filters pages by title and markdown content; roadmap updated to reflect recent 0.3.x polish, GitHub/AI, and UX shipments.

### 2026-07-11 — About menu and startup modal snooze

- **Why:** Users need a way to reopen the welcome/about dialog and optionally defer it for a month or until the next release.
- **What:** Native Help → About GitFreddo opens the startup modal; “Don’t show again for 30 days” stores snooze timestamp plus app version and skips auto-open until the version changes or 30 days pass.

### 2026-07-11 — App version in footer

- **Why:** Users should see the running GitFreddo version at a glance without opening Settings.
- **What:** Bottom footer shows `vX.Y.Z` from `getAppVersion()` and UI zoom controls (moved from the log drawer bar) on the workspace hub and main repo layout.

### 2026-07-10 — AI pull request review with scoped analysis and chat

- **Why:** Reviewers need AI help on full PRs or selected files, with follow-up prompts to refine the analysis.
- **What:** `analyze_pull_request` / `refine_pull_request_analysis` purposes, merge-base diff enrichment by SHA, file checkboxes in PR sidebar, `AnalyzePullRequestWithAi` modal with `AiPromptChat`.

### 2026-07-10 — Interactive chat to refine AI commit plan

- **Why:** After AI analysis proposes multiple commits, users should be able to select proposals and ask to merge, split, or reorganize them without re-running full analysis.
- **What:** Chat panel in the Analyze with AI modal; new `refine_commit_plan` AI purpose with `parseRefineCommitPlanResponse`; selected commit checkboxes passed as context for follow-up requests; model returns selectable **feature** groups (short titles linked to commits) for grouping and bulk selection.

### 2026-07-10 — GitHub markdown editor for PR comments

- **Why:** PR comment boxes should match GitHub’s markdown write/preview experience, and posted messages should render as formatted markdown.
- **What:** `GitHubMarkdownEditor` (toolbar + Write/Preview tabs) in PR comment/reply modals; `GitHubMarkdownBody` renders conversation, threads, and PR description as GFM.

### 2026-07-10 — PR review thread reply and resolve

- **Why:** Users need to respond to line review comments and mark threads resolved without leaving GitFreddo.
- **What:** GraphQL review threads (`listPullRequestReviewThreads`, resolve/unresolve); REST replies with pending-review handling; `PullRequestReviewThreadCard` in Overview and inline on diffs; IPC/hooks/i18n.

### 2026-07-10 — Scrollable commit sidebar and collapsible descriptions

- **Why:** Long commit bodies and file lists could overflow the right detail panel with no way to scroll or skim the message.
- **What:** Commit detail sidebar scrolls as one pane; commit descriptions truncate to ~200 characters with Show more / Show less (`CommitDescriptionPreview`, `CommitPreview`, `textPreview`).

### 2026-07-10 — PR API repo targeting and pending review comments

- **Why:** Comments were fetched/posted against the wrong GitHub repo (fork vs upstream), and line comments failed when a pending review already existed (422).
- **What:** PR APIs use the PR's canonical `repository`; multi-remote PR lookup; pending review attachment for new line comments; pending reviews shown in conversation.

### 2026-07-10 — PR line comment anchoring fix

- **Why:** GitHub line comments on PR diffs did not appear in GitFreddo (wrong diff range, missing `original_line` fallback).
- **What:** PR file diffs now use merge-base three-dot range (`base...head`); review comments normalize `original_line` and default `side` for timeline and inline display.

### 2026-07-10 — Pull request conversation in Overview

- **Why:** PR activity should match GitHub’s Conversation tab, not a separate Discussion sidebar tab.
- **What:** Merged timeline into Overview (opening post + comments/reviews); inline line comments on file diffs (`PullRequestOverviewPanel`, `DiffLineCommentBlocks`).

### 2026-07-10 — Pull request discussion timeline

- **Why:** Existing PR comments and reviews from other users were invisible in the in-app detail view.
- **What:** Fetches conversation comments, line review comments, and reviews from GitHub; merges into a chronological timeline (`listPullRequestConversationComments`, `useGitHubPullRequestTimeline`).

### 2026-07-10 — In-app GitHub pull request detail

- **Why:** Users should review and act on pull requests from the sidebar without leaving GitFreddo.
- **What:** Clicking a GitHub PR opens a full-screen detail view with split-pane layout (file list + overview/diff), merge/reopen/comment actions, and typed IPC/hooks; Bitbucket PRs still open in the browser.

### 2026-07-10 — Pull request commits and line comments

- **Why:** PR review requires seeing the commit stack and leaving feedback on specific diff lines.
- **What:** Commits tab lists PR commits from GitHub; diff rows expose review-comment actions that post via `githubPostPullRequestReviewComment` IPC (`listPullRequestCommits`, `AddPrLineCommentModal`, sidebar tabs).

### 2026-07-10 — Pull request detail UX redesign

- **Why:** The first PR detail screen was cramped and unlike other inspection flows in the app.
- **What:** Redesigned to match commit detail: overview panel, sortable file list with per-file stats, local diff via `base..head` when available, and a clearer header/action bar (`PullRequestDetail`, `PullRequestFileList`, `src/lib/github/prFiles`).

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
