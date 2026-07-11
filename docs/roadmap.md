# Roadmap

Near-term direction for GitFreddo. Not a commitment — priorities may shift.

## 0.3.x — Quality and polish

- [ ] Complete Greek (el) UI translation
- [x] macOS release builds in CI
- [x] App footer with version and UI zoom controls
- [x] Startup welcome modal with snooze (30 days or until the next app version) and **Help → About GitFreddo**
- [x] Documentation sidebar search (titles and page content)
- [ ] Merge-commit support in interactive rebase (reword, squash, drop)
- [ ] Remove dead code (orphan sidebar components, unused `WorkspaceBanner`)

## GitHub and AI

- [x] In-app GitHub pull request detail (overview, files, commits, merge/reopen, comment)
- [x] PR conversation timeline, inline diff line comments, and review thread reply/resolve
- [x] GitHub-style markdown editor for PR comments and replies
- [x] AI pull request review (full PR or selected files) with follow-up chat
- [x] AI change analysis with selectable commits, feature groups, and chat to refine the plan
- [ ] Bitbucket pull request detail in-app (sidebar PRs still open in the browser)

## Integrations

- [ ] GitLab forge support
- [x] Bitbucket Cloud forge support
- [ ] Improved GitHub Enterprise documentation and testing

## Graph and UX

- [x] Graph drag-to-select commit ranges
- [x] Coffee-themed color schemes with live preview in Settings
- [x] Header brand rail
- [x] Scrollable commit detail sidebar with collapsible long descriptions
- [ ] Timeline performance for very large repositories
- [ ] Keyboard navigation and accessibility audit
- [ ] Optional screenshots in user documentation

## Security and correctness

- [x] SSH private key cleanup after forge upload (GitHub, Bitbucket)
- [x] Ref hardening: `rev-parse --verify` before git operations that accept user-supplied refs (`fileRead`, `resetRepo`)
- [x] Multi-workspace correctness: `repoPath` threaded through AI enrichment, `openInEditor`, and `deleteWorkspaceFile` IPC
- [x] File-watcher lifecycle fixed: `switch-workspace` now starts watchers for the new path
- [ ] IPC input validation layer — schema-per-method guard on `gitfreddo:invoke` (currently trusts renderer casts)
- [ ] Validate git binary and editor command on save (reject paths that don't resolve to `git` or a real editor)
- [ ] Secret redaction in `get-settings` IPC response (never send API keys to renderer unnecessarily)
- [ ] Electron sandbox audit — move preload to sandboxed mode when feasible

## Type architecture

- [x] Git result types consolidated: renderer imports from `@shared/git/ipc` instead of re-defining in `src/lib/types.ts`
- [x] `shared/ai.ts` split into focused modules (`types`, `prompts`, `parsers`, `http`)
- [ ] IPC param types: replace `as unknown` casts in `dispatchInvoke` with a typed per-method params schema

## Testing and CI

- [x] Electron coverage floor raised from 8% → 40% lines / 38% functions
- [x] Tests added for 6 previously uncovered operation modules (`repo`, `config`, `log`, `log-search`, `notes`, `diff`) and `repo-manager` dispatch
- [ ] Tests for `bisect`, `main/index.ts` IPC registration, `main/ipc/github.ts`, `main/ipc/bitbucket.ts`
- [ ] Additional E2E paths (conflict resolution, push flow)
- [ ] Visual regression tests (optional)
- [ ] Expand component test coverage

## Longer term

- [x] Submodule workflows (v1: list, CRUD, settings-driven recurse, working-tree integration)
- [ ] Subtree workflows
- [ ] Partial clone and sparse checkout support
- [ ] Plugin or extension API

See [CHANGELOG](../CHANGELOG.md) for shipped features.
