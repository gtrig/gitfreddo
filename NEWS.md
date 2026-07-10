# News

Highlights shown in the GitFreddo startup modal. Newest tag section first.
Keep bullets short and user-facing (not commit/PR session notes — those go in `CHANGELOG.md`).

## [Unreleased]

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
