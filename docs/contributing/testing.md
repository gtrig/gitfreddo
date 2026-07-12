# Testing

GitFreddo uses Vitest for unit and component tests, and Playwright for one Electron smoke path.

## Unit tests

Logic and git output parsers live alongside source as `*.test.ts` files.

```bash
npm run test
```

Coverage report (HTML output in `coverage/`):

```bash
npm run test:coverage
```

Measured source: `src/`, `shared/`, and `electron/` (excluding test helpers and locale JSON). Thresholds in `vitest.config.ts` guard against regressions:

| Scope | Line threshold | Function threshold |
|-------|----------------|--------------------|
| Global | 78% | 66% |
| `src/lib/**` | 78% | 64% |
| `shared/**` | 80% | 85% |
| `electron/**` | 45% | 40% |

Pure logic in `src/lib/` is the primary coverage target (~80%). UI components and Electron bootstrap layers (`electron/main`, `electron/preload`, `App.tsx`) are excluded from coverage measurement; they are covered by E2E smoke where practical. **Target:** 90% project-wide lines/functions; current global coverage is ~78% lines / ~66% functions.

Coverage areas:

- `src/lib/` — graph layout, diff parsing, context menus
- `electron/git/operations/` — git command helpers
- `shared/` — AI, GitHub, theme utilities

Environment: **node** (default).

## Component tests

React component tests use `*.test.tsx` with jsdom and Testing Library.

```bash
npm run test
```

Setup:

- `src/test/setup.ts` — jest-dom matchers, global mocks
- `src/test/mocks/gitfreddo.ts` — IPC stub
- `src/test/render.tsx` — `renderWithProviders()` wrapper

Environment: **jsdom** (matched by `vitest.config.ts` glob).

## E2E smoke test

```bash
npm run build
npm run test:e2e
```

On Linux CI, tests run under `xvfb-run` for headless Electron.

The smoke spec (`e2e/app-smoke.spec.ts`):

1. Launches the built Electron app
2. Connects to `test/fixtures/minimal-repo` via IPC
3. Asserts the repository loads (branch list, timeline)

## Git smoke script

```bash
npm run smoke
```

Shell script that exercises raw git commands in a temp repo (worktree, blame, clean). Does not launch Electron.

## Fixture repository

`test/fixtures/minimal-repo/` is a committed git repository with:

- Initial commit on `main`
- A `feature` branch with one extra commit

Used by E2E and optionally validated by `scripts/smoke-test.sh`.

## CI

GitHub Actions (`.github/workflows/ci.yml`):

| Job | Steps |
|-----|-------|
| `test` | `typecheck`, `test:coverage`, `build`, `smoke` |
| `e2e` | `build`, `test:e2e` (with xvfb) |

Release workflow runs `typecheck`, `test`, and `build` before packaging.

## Writing new tests

- Prefer testing pure functions and parsers over full UI flows
- Component tests: mock `window.gitfreddo`, wrap with providers
- E2E: avoid native file dialogs — use `page.evaluate()` for IPC calls
- Keep tests deterministic — no network calls in unit tests
