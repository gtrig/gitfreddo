# Getting started

## Prerequisites

- **Node.js 24+** (for building from source)
- **git** installed and available on your PATH

## Install

Download the latest release for your platform from [GitHub Releases](https://github.com/gtrig/gitfreddo/releases):

| Platform | Format |
|----------|--------|
| Linux | AppImage or `.deb` |
| macOS | `.dmg` disk image |
| Windows | NSIS installer (`.exe`) |

Or build from source:

```bash
git clone https://github.com/gtrig/gitfreddo.git
cd gitfreddo
npm install
npm run dev
```

## First launch

When no repository is open, GitFreddo shows the **workspace hub** with four options:

1. **Open a folder** — browse for a local directory that contains a `.git` folder
2. **Initialize a new repository** — create a new git repo in an empty or new folder
3. **Clone a repository** — clone from any git remote URL (GitHub, GitLab, etc.)
4. **Create on GitHub** — create a new GitHub repository and clone it locally (requires [GitHub integration](setup/github.md))

## Multi-tab repositories

- Each open repository appears as a **tab** in the header
- Switch tabs to work on different repos without closing the app
- **Recent repositories** are listed on the workspace hub for quick access

## Settings location

App settings are stored at:

| Platform | Path |
|----------|------|
| Linux | `~/.config/gitfreddo/settings.json` |
| macOS | `~/Library/Application Support/gitfreddo/settings.json` |
| Windows | `%APPDATA%\gitfreddo\settings.json` |

Open **Settings** from the menu or header to change themes, git path, AI assist, and integrations.

## Next steps

- [GitHub integration](setup/github.md) — connect your account for PRs, issues, and authenticated git
- [Everyday Git workflow](workflows/01-everyday.md) — stage, commit, and push your first changes
