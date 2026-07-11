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

## Testing and CI

- [ ] Expand component test coverage
- [ ] Additional E2E paths (conflict resolution, push flow)
- [ ] Visual regression tests (optional)

## Longer term

- [x] Submodule workflows (v1: list, CRUD, settings-driven recurse, working-tree integration)
- [ ] Subtree workflows
- [ ] Partial clone and sparse checkout support
- [ ] Plugin or extension API

See [CHANGELOG](../CHANGELOG.md) for shipped features.
