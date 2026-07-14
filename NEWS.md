# News

Highlights shown in the GitFreddo startup modal. Newest tag section first.
Keep bullets short and user-facing (not commit/PR session notes — those go in `CHANGELOG.md`).

## [Unreleased]

## [0.4.2]

- Syntax-highlighted code editor for git hooks, repository files (.gitignore and friends), merge conflict resolution, and the interactive rebase todo.

## [0.4.1]

- Right-click a branch in the commit graph to merge in either direction: merge it into your current branch, or merge your current branch into it.
- Commit graph no longer kinks: linear history stays on a single straight lane even when the checked-out branch isn't the newest commit.
- Bitbucket pull requests load again (API page size fix).
- Bitbucket repository browsing works again after Atlassian retired the old cross-workspace list API.
- Add remote can browse or create repositories on any connected integration (GitHub, Bitbucket, or GitLab).

## [0.4.0]

- Connect GitLab — including self-managed instances — with OAuth or a personal access token to browse repositories, open merge requests, track issues, and manage SSH keys.

## [0.3.9]

- Squash and merge your current branch into another (e.g. `main`) from the branch sidebar — no manual checkout first.
- Large repositories scroll faster: diff views, file lists, the sidebar, modals, and the commit timeline all virtualize long lists so only visible rows hit the DOM.
- Commit descriptions in the detail panel render Markdown (lists, bold, links, and more).
- The right detail panel stays hidden until you select a commit, uncommitted changes, or merge conflicts — giving the timeline more room by default.
- Error notifications now show a short, plain-language message instead of raw git/network output; the full technical details are still available in the Logs drawer.
- Hover over a line in the Logs drawer to copy it to your clipboard.
- Diff viewer now shows an error message when the diff query fails, instead of silently showing "no changes".
- Fixed the header logo not appearing in packaged app releases.
- Settings → Workspace tab for the active repository: local git config, repository files, and git hooks.
- Search in-app documentation by title or page content from the Documentation sidebar.
- Help → About GitFreddo reopens the welcome dialog; snoozing hides it for 30 days or until you update to a new version.
- App version and UI zoom controls live in the bottom footer.
- Analyze GitHub pull requests with AI — entire PR or selected files — and refine the review through follow-up prompts.
- Refine AI commit plans through chat — select proposals and ask to merge, split, or reorganize before creating commits.
- AI analysis groups proposed commits by selectable feature labels (e.g. Auth, Docs) for quick bulk selection.
- PR comments and replies use a GitHub-style markdown editor with Write/Preview tabs and a formatting toolbar.
- Reply to and resolve GitHub pull request line comment threads from the PR overview and file diffs.
- Commit detail sidebar scrolls when content is long; descriptions show ~200 characters with Show more / Show less.
- Open GitHub pull requests from the sidebar to review files, commits, merge, reopen, and comment — including existing discussion, reviews, and line comments.
- AI change analysis lets you choose which proposed commits to create; unselected files stay unstaged.
- Themes preview instantly in Settings before you save.
- Themes now use coffee drink names (Iced prefix on light schemes).
- Click and drag anywhere on the commit timeline to select a range of commits.
- **Open in editor** respects the external editor command from Settings → Interface (e.g. `code --wait`).
- Drag workspace tabs to reorder them; tab order is remembered across restarts.
- Recent projects and workspace tabs persist reliably across restarts (no more lost recents when saving Settings or launching a second window).
- Full-page commit view: file list on the left, diff on the right, with **Show all files** to list every path at that revision.

## [0.3.4]

- Startup news now ships from `NEWS.md` so release highlights stay up to date.
- GitHub Upload SSH key works with OAuth (public-key permission granted at connect).
- Bitbucket Upload SSH key needs an app password connection (OAuth cannot use that API).
- Release installers include forge OAuth client configuration from CI.

## [0.3.3]

- Faster timeline rendering for large repositories.
- Improved GitHub flows for pull requests and issues.
- Expanded AI assistance for commit messages and conflict help.
