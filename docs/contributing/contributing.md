# Contributing to GitFreddo

Thank you for contributing. This guide covers local development and pull request expectations.

## Prerequisites

- Node.js 24+ (see `.nvmrc`)
- git on PATH
- Linux or Windows for full testing (Electron)

## Setup

```bash
git clone https://github.com/gtrig/gitfreddo.git
cd gitfreddo
npm install
npm run dev
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Electron with hot reload |
| `npm run build` | Production build to `out/` |
| `npm run typecheck` | TypeScript check (web + node) |
| `npm run test` | Unit and component tests |
| `npm run test:e2e` | Electron smoke test |
| `npm run smoke` | Git backend shell smoke test |
| `npm run dist` | Package installers |

## Project structure

```
electron/     Main process — git subprocesses, IPC, GitHub, LLM
src/          React renderer
shared/       Types shared between main and renderer
docs/         User and contributor documentation
test/         Fixtures for E2E
e2e/          Playwright specs
```

See [architecture.md](../architecture.md) for IPC API and layer details.

## Making changes

1. Create a branch from `main`
2. Make focused changes — one concern per commit when possible
3. Run `npm run typecheck && npm run test` before pushing
4. Open a pull request against `main`

## Pull request guidelines

- Describe **what** changed and **why**
- Note any UI-visible changes (screenshots help)
- Ensure CI passes (typecheck, test, build, smoke, e2e)
- Do not commit secrets (`.env`, API keys, tokens)

## Documentation

- User guides live in `docs/` — update when adding user-facing features
- See [testing.md](testing.md) and [i18n.md](i18n.md) for test and translation conventions

## License

By contributing, you agree your contributions follow the project's license terms.
