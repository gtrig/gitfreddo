# GitFredo

Desktop git client with commit graph — an Electron + React app that talks to `git` on your PATH.

## Prerequisites

- Node.js 20+
- `git` installed and available on PATH

## Development

```bash
npm install
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Electron with hot reload |
| `npm run build` | Production build to `out/` |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Unit tests (Vitest) |
| `npm run smoke` | Git backend smoke test |
| `npm run dist` | Package installers |

## Features

- Open local repositories or clone from URL
- Multi-tab repositories
- Branch list with checkout, create, delete, merge
- Commit timeline graph
- Working tree (staged / unstaged / untracked)
- Diff viewer
- Stash management
- Remotes with fetch, pull, push
- Merge conflict panel

Settings are stored in `~/.config/gitfredo/settings.json`.

## Architecture

See [docs/architecture.md](docs/architecture.md).
