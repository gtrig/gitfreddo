# Changelog

All notable changes to GitFreddo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Session notes for commits/PRs go under `[Unreleased]` until a git tag cuts a release section (`## [X.Y.Z]` ↔ tag `vX.Y.Z`).

## [Unreleased]

### 2026-07-11 — Hide detail panel when nothing is selected

- **Why:** The right sidebar showed a placeholder (“Select a commit or uncommitted changes”) even when the timeline had no selection, wasting horizontal space on the commit graph.
- **What:** `shouldShowDetailPanel()` in `src/lib/layout/detailPanelVisibility.ts`; `ResizableMainLayout` accepts `rightVisible` to omit the right column and resize handle; `App.tsx` hides the panel when disconnected or `timelineSelection` is empty; `DetailPanel` returns `null` instead of empty-state placeholders. Tests in `detailPanelVisibility.test.ts` and `ResizableMainLayout.test.tsx`.

### 2026-07-11 — Human-friendly error toasts and copyable log lines

- **Why:** Error toasts frequently surfaced raw git/network stderr (multi-line, jargon-heavy) or forge API errors like `GitHub API error (403): Bad credentials`, which isn't actionable for most users. Separately, copying a single line out of the Logs drawer for a bug report required manual text selection.
- **What:**
  - `src/lib/format/errorMessage.ts` (new) — `humanizeErrorMessage()` maps common git/SSH/network/filesystem/forge-API error patterns (auth failures, rejected pushes, merge conflicts, dirty working tree, missing repo/branch/file, permission/not-found errors, GitHub/Bitbucket API status codes, AI API key rejection, etc.) to short, actionable sentences; unmapped errors fall back to a sentence-cased, truncated first `fatal:`/`error:` line instead of a raw multi-line dump.
  - `src/stores/toast.ts` — `show()` now humanizes the message for `tone: 'error'` before displaying it, while logging the original raw text as the log entry's `details` so full technical output is still available in the Logs drawer for debugging.
  - `src/components/Layout/LogDrawer.tsx` — each log line now shows a copy-to-clipboard button on hover (message + details), using the existing `copyToClipboard` helper; added `tools.copyLogLine` i18n key (en/el).

### 2026-07-11 — Stop git hooks from going stale between edits

- **Why:** A pre-commit hook fix from the previous session was committed to `scripts/hooks/pre-commit`, but the live `.git/hooks/pre-commit` was a stale *copy* made before that fix — so commits kept failing with the exact Node-version-mismatch bug the fix was supposed to solve, because the copy-based install step (`setup-git-hooks.sh`) was never re-run after the edit. That's a structural footgun: any future edit to a hook silently has no effect until someone remembers a separate install step.
- **What:** `scripts/setup-git-hooks.sh` now sets `git config core.hooksPath` to point directly at the tracked `scripts/hooks/` directory instead of copying files into `.git/hooks/`. Git now always runs the tracked file directly, so hook edits take effect on the very next commit with no install step to forget. Also removes any stale copies left over from the old copy-based setup. Verified end-to-end: `git hook run pre-commit` and a from-clean-environment (`env -i`, system Node v18 on `PATH`) run of `scripts/hooks/pre-commit` both correctly self-heal to Node v24.18.0 via the NVM bootstrap and pass the full suite.

### 2026-07-11 — Make pre-commit and release test runs robust against Node/jsdom drift

- **Why:** The pre-commit hook and release CI kept failing intermittently with a wall of 40+ duplicated "Unhandled Error" stack traces from deep inside jsdom's dependency tree, plus unrelated macOS/Windows path-comparison test failures. A first pass pinned `html-encoding-sniffer` via `overrides`, but that only fixed one symptom — jsdom v29's *own* direct dependencies (`whatwg-url@16` → `webidl-conversions@8.0.1`) carry a separate, intermittent bug that only surfaces under heavy parallel load. Patching one transitive dependency at a time was whack-a-mole; the real root cause is that jsdom v28+ migrated its entire encoding/URL stack onto a bleeding-edge, still-unstable `@exodus/bytes` ecosystem.
- **What:**
  - `package.json` — pinned `jsdom` to an exact `26.1.0` (last major release before the `@exodus/bytes` migration; verified its full transitive tree — `html-encoding-sniffer`, `whatwg-url`, `webidl-conversions`, `data-urls` — has zero `@exodus/bytes` exposure). Removed the now-unnecessary `html-encoding-sniffer` override. Confirmed clean with `npm ls @exodus/bytes` and 6 repeated full-suite runs across Node 20 and Node 24 with zero flakes.
  - `scripts/check-test-env.sh` (new) — fast (<1s) pre-flight guard that (1) fails with a clear, actionable message if the active Node major version doesn't match `.nvmrc`, and (2) canary-requires and instantiates `jsdom` to catch any future dependency bump that reintroduces this class of bug, before burning a 40s test run to find out. Wired in as `pretest` / `pretest:coverage` in `package.json`, so it runs automatically before every `npm run test` and `npm run test:coverage` call — which covers the pre-commit hook, CI, *and* the release build matrix (Linux/macOS/Windows) without touching any workflow YAML, since all of them funnel through those two scripts.
  - `scripts/hooks/pre-commit` — the NVM bootstrap now installs the `.nvmrc` version if it isn't already present, and passes the version explicitly to `nvm use`/`nvm install` instead of relying on `nvm`'s own cwd-based `.nvmrc` auto-detection. Previously, `nvm use --silent || true` could silently no-op (e.g. the required version was never installed under that `NVM_DIR`) and leave whatever Node happened to be first on `PATH` active — which is exactly how a stray Node v18 slipped through and caused the jsdom crash. Also added an `fnm --install-if-missing` path for fnm users. Then calls `check-test-env.sh` explicitly as a final guard, so a still-broken environment fails in under a second with a clear diagnosis instead of a 40-second run ending in cryptic stack traces. Verified by simulating a stray Node v18 stub ahead on `PATH`: the hook now self-corrects and passes; an unresolvable `.nvmrc` version now fails in <1s with an actionable message instead of silently continuing on the wrong version.
  - `electron/git/operations/repo.test.ts` — `root equals tmpDir` test no longer compares path *strings* (which differ across OSes in ways `realpathSync` alone doesn't fully normalise — e.g. Windows CI often sets `TEMP` itself to an 8.3 short-name path like `RUNNER~1`, which `git` resolves to the real long name but Node's JS-level `realpathSync` does not, since it only resolves symlinks, not short-name segments). Now asserts filesystem identity via `statSync(...).dev` + `.ino`, which is immune to symlinks, short names, casing, and trailing slashes on every OS.
  - `electron/git/operations/log.test.ts` and `log-search.test.ts` — git commits in test setup now pass `GIT_AUTHOR_NAME` / `GIT_COMMITTER_NAME` env vars explicitly, preventing the system's global `user.name` from leaking into assertions.

### 2026-07-11 — Full-project review: bug fixes, refactors, and coverage boost

- **Why:** Full code review pass to fix correctness and security bugs, reduce tech debt in large files, consolidate duplicated types, and harden the test suite.
- **What:**
  - P0 CI: fixed stale `StartupModal` news-bullet assertion that was failing the test suite.
  - P1 correctness: `switch-workspace` now starts file watchers; `repoPath` threaded through AI enrichment and file/editor IPC for multi-tab correctness; amend-message overwrite fixed in `CommitPanel`; AI multi-commit flow gets rollback on partial failure.
  - P1 security: SSH private-key temp dirs cleaned up after forge upload; `resolveGitRef` applied before `fileRead` and `resetRepo` to harden ref inputs against flag injection.
  - P2 UX: `DiffOverlay` shows query errors instead of "no changes"; stale multi-select context menu fixed; GPG sign and diff-view-mode settings now resync from live settings.
  - P3 gaps: `log.search`, `undo.peek`, `notes.list` documented; Bitbucket OAuth server closes on timeout; IPC input validated via `ALL_GIT_IPC_METHODS` set.
  - Refactor — backend: `repo-manager.ts` god-switch replaced with a per-domain handler registry keyed off `GIT_IPC_METHODS`; `main/index.ts` GitHub and Bitbucket IPC extracted to `electron/main/ipc/`; `shared/ai.ts` split into `types`, `prompts`, `parsers`, `http` sub-modules.
  - Refactor — types: `src/lib/types.ts` now re-exports all git result shapes from `@shared/git/ipc` — single source of truth, no more drift.
  - Refactor — UI: `WorkingTreeFileRow.tsx` extracted from `GitWorkingTree.tsx`; `TimelineBranchTagRow.tsx` extracted from `CommitTimeline.tsx`; `generateSshKeyPair` deduplicated into `electron/forge/ssh-key-pair.ts` shared by GitHub and Bitbucket.
  - Test CI: electron coverage threshold raised from 8% → 40% lines; tests added for `repo-manager` dispatch, and `repo`, `config`, `log`, `log-search`, `notes`, `diff` operation modules (46 new tests, 864 total).
  - Roadmap updated with new work items: IPC validation layer, security hardening items, type architecture goals, and CI targets.

### 2026-07-11 — Header logo in packaged builds

- **Why:** The brand rail used `/logo.png`, which resolves to the filesystem root under Electron `file://` loads and showed a broken image in release builds.
- **What:** `brandLogoUrl()` builds the logo path from `import.meta.env.BASE_URL`; `AppBrandRail` uses it so packaged apps load `./logo.png` next to `index.html`.

### 2026-07-11 — Canonical hooks directory paths on macOS and Windows

- **Why:** Release CI failed on macOS (`/var` vs `/private/var`) and Windows (8.3 vs long temp paths) when comparing Git-resolved hook directories to Node paths.
- **What:** Added `canonicalizePath()` in `repo-path.ts`; `hooksList`/`resolveHooksDir` normalize paths via `realpathSync.native`; hooks tests compare canonical paths and cover symlink aliases.

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
- **What:** `npm run release:prepare -- vX.Y.Z` syncs version files and prints release steps; `scripts/hooks/pre-push` validates `v*` tags against `package.json` (installed to `.git/hooks/` via `npm install`); `scripts/run-ts.sh` resolves Node 24 from `.nvmrc` so release scripts work when system `node` is older.

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
