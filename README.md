<p align="center">
  <img src="assets/readme_logo.png" alt="GitFreddo" width="500" height="200" />
</p>

# GitFreddo

Desktop git client with commit graph — an Electron + React app that talks to `git` on your PATH.

## Prerequisites

- Node.js 24+
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
| `npm run test` | Unit and component tests (Vitest) |
| `npm run test:e2e` | Electron smoke test (Playwright) |
| `npm run smoke` | Git backend smoke test |
| `npm run dist` | Package installers |

## Documentation

Full guides live in [docs/](docs/README.md):

- [Getting started](docs/getting-started.md) — install and open your first repository
- [GitHub setup](docs/setup/github.md) — OAuth, PAT, PRs and issues
- [AI assistant setup](docs/setup/ai-assistant.md) — local LLM or cloud API
- [Workflows](docs/workflows/01-everyday.md) — everyday Git through advanced history editing

See also [CHANGELOG.md](CHANGELOG.md) and [docs/architecture.md](docs/architecture.md) for developers.

Settings are stored in the app data directory for your platform (see [Getting started](docs/getting-started.md#settings-location)).
