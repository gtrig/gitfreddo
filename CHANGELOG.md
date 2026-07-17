# Changelog

All notable changes to GitFreddo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Session notes for commits/PRs go under `[Unreleased]` until a git tag cuts a release section (`## [X.Y.Z]` ↔ tag `vX.Y.Z`).

## [Unreleased]

## [0.4.6] - 2026-07-17

### 2026-07-17 — Bind Release bake to the release_secrets Environment

- **Why:** Forge OAuth secrets (including GitLab) live on the GitHub Environment `release_secrets`, but the Release job never set `environment:`, so `${{ secrets.GITLAB_* }}` was empty. That matches the IDE “Context access might be invalid” warning and the failed v0.4.6 bake-env check.
- **What:** Set `environment: release_secrets` on the Release build job; keep secret names aligned with the Environment (`GITLAB_CLIENT_ID` / `GITLAB_CLIENT_SECRET`); update docs and bake-guard messaging.

### 2026-07-17 — Match terminal push behavior (submodule recursion default)

- **Why:** App push failed with a misleading “remote has changes / pull first” toast while `git push` in the terminal succeeded. The app defaulted to `--recurse-submodules=check` (unlike git’s default `no`), and any `failed to push some refs` was humanized as a non-fast-forward.
- **What:** Default `pushSubmoduleRecursion` is now `no`; settings mode `no` emits `--recurse-submodules=no` so it overrides repo config. Error humanization distinguishes submodule-check, protected-branch, and hook failures from real non-fast-forward rejections.

### 2026-07-17 — Fail release builds when forge OAuth bake env is empty

- **Why:** v0.4.5 shipped with empty GitLab OAuth credentials even though the workflow mapped `GITLAB_CLIENT_ID`/`GITLAB_CLIENT_SECRET` — missing or misnamed Actions secrets become blank strings and bake silently. GitHub/Bitbucket were present in the same artifact; only GitLab was empty.
- **What:** Added `electron/forge-oauth-bake-guard.ts` + `scripts/check-forge-oauth-bake-env.sh`, wired as a Release workflow step before build/dist; docs note repository-secret naming; regression tests cover the guard and workflow step.

## [0.4.5] - 2026-07-17

### 2026-07-17 — Bake GitLab OAuth credentials into release builds

- **Why:** GitLab OAuth worked in development (project `.env`) but failed in release installers because CI never injected `GITLAB_CLIENT_ID` / `GITLAB_CLIENT_SECRET` into the bake step (unlike GitHub and Bitbucket).
- **What:** Mapped `GITLAB_CLIENT_ID` and `GITLAB_CLIENT_SECRET` Actions secrets into `.github/workflows/release.yml` build env; updated setup/docs/`.env.example`; added a regression test that asserts the release workflow wires all forge OAuth secrets.

## [0.4.4] - 2026-07-16

### 2026-07-16 — Keep current-branch checkmark after commit

- **Why:** After creating a commit, the green checkmark on the checked-out branch disappeared in the sidebar and commit graph until a manual refresh.
- **What:** Fixed stale query invalidation: IPC mutations and repo-change refresh now target `repo.status` (not the unused `status` suffix). `commit.create` and `commit.reword` also refresh `branch.list` so branch head and current markers stay in sync with the graph.

## [0.4.3] - 2026-07-14

### 2026-07-14 — Highlight the current branch line in green on the commit graph

- **Why:** It was hard to see at a glance which commits belong to the active branch vs. side branches that were merged in.
- **What:** The commit graph now paints the first-parent line green. When a commit is selected it highlights that commit's first-parent ancestry; with nothing selected it highlights HEAD's first-parent line (the active branch). First-parent traversal keeps merged-in side branches out of the highlight. Added `collectAncestors` / `collectFirstParentAncestors` (`src/lib/git/commitReachability.ts`), `ancestor`/`ancestorStroke` colors with `--gf-graph-ancestor(-stroke)` CSS vars across all themes (`useGraphColors`), and an `ancestorHashes` prop on `CommitGraphOverlay` used by `CommitTimeline`. Added co-located tests for the helpers and the overlay.

## [0.4.2] - 2026-07-14

### 2026-07-14 — CodeMirror editor for code-bearing textboxes

- **Why:** Git hooks, repo config files, conflict resolution text, and the interactive rebase todo were plain monospace textareas — hard to edit without line numbers or syntax highlighting.
- **What:** Added a shared CodeMirror 6 `CodeEditor` (`src/components/Ui/CodeEditor.tsx`) themed with GitFreddo CSS variables, plus `detectLanguage` (`src/lib/editor/detectLanguage.ts`) for filename-based highlighting. Wired it into `RepoHooksPanel` (shell), `RepoFilesPanel` (plaintext), `ConflictOutputEditor` (language from file path), and `RebaseSequenceModal` (plaintext). Renderer tests mock `CodeEditor` as a textarea under jsdom; `CodeEditor.tsx` is excluded from coverage like other non-jsdom UI.

### 2026-07-14 — Stop version-controlling git hooks; manage them per workspace

- **Why:** Git hooks were tracked in the repo (`scripts/hooks/`) and force-installed via `core.hooksPath`, but hooks should live in each repo's own `.git/hooks/` and be managed per workspace by the GitFreddo app — not shipped in version control.
- **What:** Removed the tracked `scripts/hooks/pre-push` hook, the `scripts/setup-git-hooks.sh` installer, and the `prepare` npm lifecycle that pointed `core.hooksPath` at `scripts/hooks/`. Deleted `scripts/check-release-pre-push.ts` (the hook's release-tag guard) and the now-unused `parseReleaseTagsFromPrePush`/`findReleaseTagVersionMismatches`/`packageVersionMatchesReleaseTag` helpers plus their tests in `shared/release-version.ts` (kept `normalizeReleaseTag`, still used by `release:prepare`). Updated docs (`docs/setup/git-and-credentials.md`, `docs/workflows/updates.md`, `.cursor/commands/release.md`) to note there is no pre-push hook and CI enforces `typecheck`/`test` on push. The app's per-workspace hook manager (`electron/git/operations/hooks.ts`, Settings → Repo hooks) is unchanged.

## [0.4.1] - 2026-07-14

### 2026-07-14 — Fix Windows CI failure in forge token-store test

- **Why:** `electron/forge/token-store.test.ts` hard-coded a POSIX token path, so it failed on Windows where `path.join` produces backslash-separated paths (`\tmp\...\forge-token.enc`).
- **What:** The `writeFile` assertion now builds the expected path with `join('/tmp/gitfreddo-test-data', 'forge-token.enc')` so it matches the implementation on every OS. The sibling GitHub/Bitbucket/GitLab token-store tests already used `toHaveBeenCalled()` and were unaffected.

### 2026-07-14 — `/release` Cursor command

- **Why:** Cutting a release meant remembering the full sequence of CI-equivalent checks plus the local prerelease steps (version bump, changelog/news promotion, tag) by hand.
- **What:** Added `.cursor/commands/release.md` — a `/release vX.Y.Z` command that runs `typecheck`, `test:coverage`, `build`, `smoke`, and `test:e2e`, then (only if green) runs `release:prepare`, promotes `[Unreleased]` notes in `CHANGELOG.md`/`NEWS.md` into the version section, commits `chore: release`, and creates the tag — stopping before push.

### 2026-07-14 — Two-way branch merge from the graph context menu

- **Why:** The branch ref context menu only offered a one-way "Merge into current…"; users want to merge in either direction relative to the checked-out branch.
- **What:** Added a `merge.into` git operation (checks out the target branch, then merges the source, leaving HEAD on the target) with IPC wiring (`shared/git/ipc`, `repo-manager`, `useGitMutations.mergeInto`). `localBranchContextMenuItems` now shows directional labels — "Merge A into <current>" and "Merge <current> into A" (new) — gated on a known current branch and an `onMergeCurrentInto` handler; wired through `timelineRefContextMenu`, `useTimelineRefContextMenu`, and `CommitTimeline`. `MergeBranchDialog` accepts an explicit `targetBranch` and routes the reverse direction to `mergeInto`. Added i18n key `contextMenu.sidebar.mergeBranchIntoBranch` (en/el) and co-located tests.

### 2026-07-14 — Fix commit graph lane break on linear history

- **Why:** When HEAD was behind the newest commit on a linear branch, the commit graph spine detoured out to a side lane and back for one commit, making the vertical path look broken/kinked.
- **What:** `buildGitGraphLayout` no longer displaces a column-0 commit when it is HEAD's own first-parent child; only genuinely divergent branches are pushed aside, so linear chains stay on one lane. Added a regression test in `src/lib/graph/gitGraphLayout.test.ts`.

### 2026-07-14 — Structural forge/ops deduplication pass

- **Why:** Parallel GitHub/GitLab/Bitbucket stacks and repeated git/modal/hook patterns ballooned the codebase without behavior differences worth keeping.
- **What:** Shared `shared/forge.ts` types; `electron/forge/` token-store/OAuth-callback/HTTP/connection/repo-cache/repo-context helpers; generic forge UI (`CreateChangeRequestModal`, `ForgeRepoPicker`, `ForgeEditIssueModal`) with thin provider wrappers; `useRepoQuery`; context-menu builders; `RenameEntityModal`; commit-message / connector / format helpers; dead virtual-list code removed; docs naming aligned to PascalCase `.tsx`; unused-i18n soft gate. See `docs/refactor-plan.md`.

### 2026-07-14 — Deduplicate forge SSH key helpers

- **Why:** GitHub, GitLab, and Bitbucket each copied generate-and-upload cleanup, SSH title normalization, and stored-vs-discovered title resolution.
- **What:** Shared `withGeneratedSshKey` / `SshKeyResult` in `electron/forge/ssh-key-upload.ts`; `resolveStoredOrDiscoveredSshKeyTitle` in `electron/forge/resolve-ssh-key-title.ts`; `sshKeyTitleFromSettings` in `shared/forge-ssh.ts`; forge `ssh-keys` modules and services now use those helpers.

### 2026-07-13 — Bitbucket PR list and retired issues API

- **Why:** Pull request listing failed with `Invalid pagelen` (Bitbucket caps PR pages at 50, not 100); issue listing failed with HTTP 410 as Atlassian retires native Bitbucket Issues.
- **What:** `listPullRequests` uses `pagelen=50` with full pagination via `bitbucketJsonAllPages`; issue API maps 404/410 to coded unavailable reasons; sidebar shows a muted notice (not a red error) and hides create/filter when Bitbucket issues are unavailable. Added i18n strings and tests.

### 2026-07-13 — Bitbucket repo listing API migration (CHANGE-2770)

- **Why:** Bitbucket removed the cross-workspace `GET /2.0/repositories` endpoint; browse/create flows returned HTTP 410.
- **What:** `listUserRepos` now discovers workspaces via `GET /2.0/user/workspaces` and lists repositories per workspace with `GET /2.0/repositories/{workspace}`; `listWorkspaces` uses the same user-workspaces endpoint. Added aggregation/dedup tests; updated setup docs and troubleshooting.

### 2026-07-13 — Add remote from active integrations

- **Why:** Add remote only offered GitHub browse/create even when Bitbucket or GitLab were connected.
- **What:** `AddRemoteModal` now lists browse/create actions for each connected forge (GitHub, Bitbucket, GitLab) with tabbed repository picker when multiple integrations are active; added `getConnectedForges` / `useConnectedForges` helper. Updated i18n strings and setup docs.

### 2026-07-13 — CI stability on Windows
- **What:** Platform-aware path assertions in `loadAppIcon` and GitHub SSH-key tests; `buildGitNodeEditorCommand` quotes/normalizes sequence-editor paths for Git for Windows; broader `stripGitTraceLines` + use in `runGitOrThrow`; CI unit `testTimeout` raised to 30s.

## [0.4.0] - 2026-07-13

### 2026-07-13 — GitLab integration (OAuth/PAT, MRs, issues, SSH keys)

- **Why:** Add GitLab (including self-managed instances) as a first-class forge alongside GitHub and Bitbucket.
- **What:** New renderer layer mirroring Bitbucket — `useGitlab*` hooks; `src/components/GitLab/` (RepoPicker, Create/Fork repo modals, CreatePrModal, EditIssueModal); `GitlabIntegrationCard` (OAuth + PAT + self-managed host); forge detection/context/PR-action wiring with precedence Bitbucket > GitLab > GitHub; sidebar PR/issue and WorkspaceHub clone/create dispatch; GitLab merge requests open in the browser. Added full backend test coverage for `electron/gitlab/**` (client, http, repos, pulls, issues, oauth incl. callback-server flow, service delegation, ssh-keys, token-store, repo-context) plus renderer tests for the integration card, WorkspaceHub GitLab paths, forge modal, and detect. **95.0% line coverage**; typecheck, build, smoke, and e2e green.

### 2026-07-13 — Coverage expansion batch 5 (95% lines)

- **Why:** Close the gap to 95% line coverage after batches 1–4 and flaky-test fixes.
- **What:** Expanded tests for `MergeBranchDialog`, `AddRemoteModal`, `MultiCommitSelectionBar`, `BitbucketIntegrationCard`, `AnalyzeChangesWithAi`, `SidebarIssuesSection`, `useTimelineDragSelect`, `repo-manager`, `ExplainCommitWithAi`, and `LocalBranchesSection` (virtualized branches, PR success toast). Raised Vitest line thresholds to **95%** (global, `src/lib/**`, `shared/**`; `electron/**` remains 90%). **2,121 tests pass**; **95.0% line coverage**.

### 2026-07-13 — Stabilize OAuth and virtual list tests

- **Why:** Full-suite runs intermittently failed on Bitbucket OAuth port binding and post-teardown virtualizer timers.
- **What:** Bitbucket OAuth callback server now binds directly with port retry and OS-assigned fallback (no probe/listen race); tests track active flows and use ephemeral ports. `FixedHeightVirtualList` tests flush fake timers before cleanup.

### 2026-07-13 — Coverage expansion batch 4 (~94.5% lines)

- **Why:** Continue toward 95% line coverage with another reviewable 10-file batch.
- **What:** Expanded tests for `RebaseSequenceModal`, `CleanUntrackedModal`, `WorkspaceTabs`, `AddWorktreeModal`, `GithubIntegrationCard`, `RepoHooksPanel`, `RowResizeHandle`, `status` (clean preview + conflict classification), `shared/ai` conflict parser skips, and `repo-manager-invoke` multi-hash cherry-pick. Fixed Bitbucket OAuth port selection to read `GITFREDDO_OAUTH_PORT` at runtime and hardened OAuth tests (monotonic ports, longer timeouts). **2,067 tests pass**; **94.47% line coverage**.

### 2026-07-13 — Coverage expansion batch (22 test files, ~94% lines)

- **Why:** Push line coverage toward 95% with reliable, reviewable increments.
- **What:** Added/expanded tests in three batches (10+10+2 files): GitHub/Bitbucket SSH keys, forge key-pair, open-in-editor, branchVisibility/layout stores, useAiFill and forge status hooks, usePushRemote/useAppUpdate, AddSubmoduleModal, ContextMenu, ColumnResizeHandle, SquashMergeIntoModal, PickaxeSearchModal, CreatePrModal MergePrButton, settings normalization, workspace restore edge cases, GitHub pulls list/create, shared AI parser errors. Hardened Bitbucket OAuth tests (`describe.sequential`, per-process port offset, server cleanup). **2,038 tests pass** (full suite green).

### 2026-07-13 — Vitest projects and AI-friendly test scripts

- **Why:** AI agents run tests frequently during TDD; a monolithic Vitest config forced the full ~45s suite even when only node or renderer code changed.
- **What:** Split Vitest into **`unit`** (node: `electron/`, `shared/`, `src/lib/`, `src/locales/`) and **`renderer`** (jsdom: components, hooks, stores) projects with a minimal `src/test/setup.node.ts` so node tests skip jsdom/jest-dom overhead. Added `npm run test:unit`, `test:renderer`, `test:changed`, and `test:quick`. Improved failure output (`outputDiffLines`, `outputDiffMaxSize`). Fixed unhandled rejection in `git-runner.test.ts` timeout test. Updated `AGENTS.md`, `.cursor/rules/gitfreddo.mdc`, and `docs/contributing/testing.md`.

### 2026-07-12 — Test coverage to 90% and CI fixes

- **Why:** Raise project line coverage to 90% and fix test regressions blocking CI.
- **What:** Added/expanded co-located tests across renderer components, hooks, electron/git operations, OAuth helpers, and shared parsers (timeline, working tree, detail panel, sidebar, modals, merge conflicts, forge flows). Fixed stale expectations (i18n strings, virtualizer mocks), **`MergeCommitFooter`** description label and rebase/cherry-pick continue without commit message, and **Bitbucket OAuth** callback server lifecycle (listen before progress, clean shutdown). **1,903 tests pass; 90.82% line coverage.** CI green: typecheck, test:coverage, build, smoke.

### 2026-07-12 — Coverage push toward 85% (~84% lines)

- **Why:** User requested continuing test expansion toward 85% line coverage.
- **What:** Expanded `CommitTimeline` (overlay click/context menu/double-click checkout, arrow-up with no selection, detached HEAD/tags), `useTimelineDragSelect` (drag range, double-click, auto-scroll, pointer cancel), `LocalBranchesSection` (rename/squash/PR/delete menus), `GitWorkingTree` (unstage, discard confirm, rename modal), `MergeConflictsPanel` (AI auto-resolve, marker guard, nested tree), `PullRequestDetail` (merge/reopen, comments, pane switching), `SubmodulesSection` (bulk update/sync, row init/deinit), and `electron/github/service` (PR commits/comments/reviews/threads/reply). Global coverage now **84.1% lines / 72.1% functions** (~340 lines still needed for 85%). Vitest thresholds remain at 80% lines until 85% is reached.

### 2026-07-12 — Coverage push toward 85% (~83% lines)

- **Why:** User requested continuing test expansion toward 85% line coverage (from ~81.5%).
- **What:** Expanded `CommitPanel` (stage/amend/sign/push/AI/stash/collapse), `WorkspaceHub` (clone URL/parent validation, GitHub/Bitbucket create, modal Escape), `CommitFileList` (tree mode, show-all, loading/empty), `LogDrawer` (git tab, resize, clear), `LocalBranchesSection`/`RemoteBranchesSection` (context menus, create branch), `GitWorkingTree` (context menu stage, clean untracked), `SidebarPullRequestsSection`/`SidebarIssuesSection` (row click, create/merge/filter), `TagsSection`, `MergeConflictsPanel`, and `multiCommitContextMenu`. Global coverage now **82.9% lines / 70.7% functions** (~790 lines still needed for 85%). Vitest thresholds remain at 80% lines until 85% is reached.

### 2026-07-12 — Cross 80% line coverage threshold

- **Why:** Continue toward 90% project-wide coverage; user requested reaching 80% lines first.
- **What:** Expanded tests for `GitWorkingTree` (disconnected/loading/error/conflicted/path toggle), `RepoHooksPanel` (save/enable/connect prompt), `MaintenanceSettingsPanel` (prune flow), `commitContextMenu`, `timelineCommitColumns`, and `useTimelineDragSelect` (stash/ctrl click). Global coverage now **80.2% lines / 67.5% functions**. Raised Vitest global line threshold to **80%** (functions 67%).

### 2026-07-12 — Component and store test expansion (coverage ~80%)

- **Why:** Continue closing the gap toward 90% project-wide coverage after the first expansion pass (~78.5% lines).
- **What:** Expanded or added tests for `MergeConflictsPanel` (rebase title, path/tree toggle, mark-all-resolved, resolved files), `RemoveStaleBranchesModal`, `SplitDiffView`, `ComposeCommitsModal`, `WorkspaceHub` (init repo, recents filter/open), `CommitTimeline` (stash rows/keyboard), and `operation` store (`showHookExecutionToast`, hook output). Global coverage now ~79.8% lines / ~67.2% functions.

### 2026-07-12 — Coverage push toward 90%

- **Why:** Project-wide coverage was ~74% lines / ~65% functions; user requested raising overall coverage toward 90%.
- **What:** Added integration tests for git merge/rebase operations, LLM context enrichment (`resolve_conflict`, `commit_message`, `stash_message`, `analyze_changes`), repo watcher, Bitbucket pulls API, and expanded component/hook tests (`LocalBranchesSection`, `RemoteBranchesSection`, `useTimelineDragSelect`, `MergeConflictsPanel`, Bitbucket/GitHub repo pickers, `CreateBitbucketRepoModal`, `ThreeWayCodePane`, `PullRequestCommitsPanel`, `ExplainCommitWithAi`, `CommitFileList`). Global coverage now ~78% lines / ~66% functions (~4.5k lines still needed for 90%). Raised Vitest line threshold to 78% and electron line threshold to 45%; documented 90% target in `docs/contributing/testing.md`.

### 2026-07-12 — Function coverage push toward 70%

- **Why:** Global function coverage lagged lines/statements (~54% vs ~70%); the Vitest functions threshold was raised to 70% but the suite did not yet meet it.
- **What:** Expanded IPC dispatch tests (`electron/git/repo-manager-invoke.test.ts`), Bitbucket service API tests, context-menu and hook coverage (`useGit`, `useCommitContextMenu`, `useTimelineRefContextMenu`, `useGitMutations`), and component tests (`CommitTimeline`, `WorkspaceHub`, `GitWorkingTree`, `CommitPanel`, `MaintenanceSettingsPanel`, `SubmodulesSection`, `PullRequestDetail`, `CommitFileList`). Function coverage ~65% (up from ~54%); lines/statements ~74%. CI `test:coverage` still fails the 70% functions gate until remaining component/hook handlers are covered.

### 2026-07-12 — Project-wide 70% test coverage threshold

- **Why:** Global coverage was ~46% with a 26% floor; CI did not enforce meaningful coverage on hooks, components, or electron integration code.
- **What:** Raised global Vitest thresholds to 70% lines/statements (68% branches, 54% functions) in `vitest.config.ts`; excluded Electron/renderer bootstrap and `ConflictMergeOverlay` from measurement. Added ~50 test files across hooks (`useAutoRefresh`, `useCommitContextMenu`, forge status), components (working tree, sidebar, timeline, tools menu), and electron (`github/repo-context`, `bitbucket/repo-context`, expanded `github/service`). Updated `docs/contributing/testing.md` threshold table.

### 2026-07-12 — Hook and workspace store test coverage

- **Why:** `src/hooks/` and `src/stores/workspace.ts` had low test coverage; workspace tab lifecycle and IPC hooks lacked regression tests.
- **What:** Expanded `workspace.test.ts` and added `workspace.restore.test.ts` for open/switch/close/persist/restore/reconnect/PR detail/tab label. New hook tests: `useGit`, `useGitMutations`, `useTheme`, `useLocale`, `useContextMenu`, `useInvalidateGit` using `createGitFreddoMock`, `renderHook`, and `QueryClientProvider`.

## [0.3.9] - 2026-07-12

### 2026-07-12 — Squash and merge active branch into another branch

- **Why:** Merging a feature branch into `main` with squash required manually checking out the target first; users wanted a single action from the branch they're on.
- **What:** New `merge.squashInto` IPC/operation checks out the target branch, runs `git merge --squash` from the active branch, and commits with an editable message. Right-click the current branch in the sidebar → **Squash and merge into…** opens `SquashMergeIntoModal` with target picker. Tests for `mergeSquashInto`, `buildSquashMergeIntoMessage`, and context menu wiring. Docs updated in `docs/workflows/02-branching-and-merging.md`.

### 2026-07-12 — Move typecheck/test hook from pre-commit to pre-push

- **Why:** Running the full typecheck + test suite on every commit made small, frequent commits slow; the guarantee that matters is that no untested code reaches the remote, which pre-push enforces just as well.
- **What:** Deleted `scripts/hooks/pre-commit`; `scripts/hooks/pre-push` now runs the Node-version bootstrap, `check-test-env.sh`, `npm run typecheck`, and `npm run test` before the existing release-tag/`package.json` version check. The hook captures git's ref lines from stdin up front so npm/vitest can't consume them before the release check reads them. Docs updated (`docs/setup/git-and-credentials.md`, `docs/workflows/updates.md`). Verified by running the hook end-to-end (full suite green) and confirming a mismatched `v*` tag push is still blocked.

### 2026-07-12 — React Virtual rollout across all list-heavy UI surfaces

- **Why:** `@tanstack/react-virtual` was installed but never used; large repositories caused excessive DOM node counts in the diff viewer, file lists, sidebar, modals, and the commit timeline — degrading scroll and interaction performance.
- **What:**
  - **Phase 0 (foundation):** `src/lib/ui/virtualList.ts` — shared constants (`VIRTUALIZE_THRESHOLD = 50`, `CODE_LINE_HEIGHT`, `COMPACT_ROW_HEIGHT`, `FILE_ROW_HEIGHT`, `VIRTUAL_OVERSCAN`) and `shouldVirtualize` helper. `flattenVisibleFileTree` and `flattenVisibleBranchTree` flatten tree structures for virtualizers. `buildDiffVirtualItems` flattens unified diff rows. `FixedHeightVirtualList` and `DynamicVirtualList` generic components. `useFixedVirtualizer` and `useDynamicVirtualizer` hooks. All with co-located unit tests.
  - **Phase 1 (diff views):** `FullFileView`, `SplitDiffView`, `ThreeWayCodePane`, and `UnifiedDiffView` all virtualize their line/row lists. Parent overlays (`DiffOverlay`, `CommitDetailOverlay`, `FileHistoryOverlay`, `PullRequestDetail`) moved scroll ownership into child views.
  - **Phase 2 (file lists):** `CommitFileList`, `PullRequestSidebar`, `StashPreview`, `GitWorkingTree`, and `MergeConflictsPanel` virtualize path-mode lists; tree mode uses `flattenVisibleFileTree` before virtualizing.
  - **Phase 3 (history + logs):** `FileHistoryOverlay` commit sidebar virtualizes with `scrollToIndex` on selection. `LogDrawer` uses dynamic-height virtualization with preserved pinned-to-bottom auto-scroll.
  - **Phase 4 (sidebar sections):** `TagsSection`, `SidebarIssuesSection`, `SidebarPullRequestsSection` each virtualize with inner scroll containers (capped at 40 vh) when list exceeds threshold.
  - **Phase 5 (modals + pickers):** `ReflogModal`, GitHub and Bitbucket `RepoPicker`, `WorkspaceHub` recents, `RemoveStaleBranchesModal` refs, `CleanUntrackedModal`, `StashPushModal` paths, `MaintenanceSettingsPanel` commits preview, `MultiCommitSelectionBar`, and `PullRequestCommitsPanel` all virtualize behind the threshold gate.
  - **Phase 6 (timeline migration):** `CommitTimeline` migrated from custom `useTimelineVirtualWindow`/`timelineVirtualWindow.ts` to `useVirtualizer` with `paddingStart` for prefix rows. Drag-select and scroll-to-primary behaviors preserved. Old custom windowing files deleted.
  - **Phase 7 (hard cases):** `LocalBranchesSection` uses `flattenVisibleBranchTree` with path-based folder keys and a virtualizer (max 50 vh); `BranchTree` sub-component updated to use consistent slash-joined folder paths. `PullRequestConversationTimeline` gains dynamic-height virtualization with `measureElement`.
  - Global `ResizeObserver` stub in `src/test/setup.ts` provides a 500 × 800 px virtual viewport for jsdom tests so virtualizers render windowed items correctly.

### 2026-07-12 — Markdown in commit descriptions

- **Why:** Commit message bodies often use Markdown (lists, bold, links) but the detail panel showed raw syntax as plain text.
- **What:** `CommitDescriptionPreview` renders the body with `GitHubMarkdownBody` (GFM); same component used in the expanded commit detail overlay. Test coverage for formatted descriptions.


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

[0.4.6]: https://github.com/gtrig/gitfreddo/releases/tag/v0.4.6
[0.4.5]: https://github.com/gtrig/gitfreddo/releases/tag/v0.4.5
[0.4.4]: https://github.com/gtrig/gitfreddo/releases/tag/v0.4.4
[0.4.3]: https://github.com/gtrig/gitfreddo/releases/tag/v0.4.3
[0.4.2]: https://github.com/gtrig/gitfreddo/releases/tag/v0.4.2
[0.4.1]: https://github.com/gtrig/gitfreddo/releases/tag/v0.4.1
[0.4.0]: https://github.com/gtrig/gitfreddo/releases/tag/v0.4.0
[0.3.4]: https://github.com/gtrig/gitfreddo/releases/tag/v0.3.4
[0.2.0]: https://github.com/gtrig/gitfreddo/releases/tag/v0.2.0
