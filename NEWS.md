# News

Highlights shown in the GitFreddo startup modal. Newest tag section first.
Keep bullets short and user-facing (not commit/PR session notes — those go in `CHANGELOG.md`).

## [Unreleased]

- Full-page commit view: file list on the left, diff on the right, with **Show all files** to list every path at that revision.
- **Full file** view mode in commit detail and file history (alongside unified and side-by-side).
- **Open in editor** on commit detail, file history, and diff overlays.

## [0.3.4]

- Startup news now ships from `NEWS.md` so release highlights stay up to date.
- GitHub Upload SSH key works with OAuth (public-key permission granted at connect).
- Bitbucket Upload SSH key needs an app password connection (OAuth cannot use that API).
- Release installers include forge OAuth client configuration from CI.

## [0.3.3]

- Faster timeline rendering for large repositories.
- Improved GitHub flows for pull requests and issues.
- Expanded AI assistance for commit messages and conflict help.
