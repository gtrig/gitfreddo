# AGENTS.md — GitFreddo Agent Instructions

This file provides instructions for AI agents working on the GitFreddo codebase.

## Project Overview

**GitFreddo** — Desktop git client with commit graph (Electron + React + TypeScript). Talks to `git` on your PATH.

- **Runtime**: Node.js 24+ (see `.nvmrc`), Electron 41+
- **UI**: React 18, TanStack Query, Zustand, Tailwind CSS 4, @xyflow/react
- **IPC**: Typed via `shared/ipc.ts` — exposed as `window.gitfreddo`
- **Testing**: Vitest (unit/component), Playwright (E2E smoke)
- **CI**: GitHub Actions — typecheck, test:coverage, build, smoke, e2e

## Project Structure

```
src/                      Renderer process
  components/<Feature>/   React components (PascalCase folders)
  hooks/                  IPC hooks — useGit.ts (read), useGitMutations.ts (write)
  lib/<domain>/           Pure logic: graph, timeline, diff, conflicts, context-menus, workspace, git, format
  stores/                 Zustand: selection, workspace, layout
  locales/                i18n catalogs
electron/
  main/                   Window, menu, IPC registration
  preload/                window.gitfreddo bridge
  git/
    repo-manager.ts       Routes invoke → operation modules
    git-runner.ts         Spawns git subprocess
    operations/<domain>.ts  One module per git domain (branch, log, diff, remote, etc.)
  github/, llm/           OAuth, API, AI assist
  settings.ts             App settings persistence
shared/                   Types shared across processes (import as @shared/...)
  ipc.ts                  IPC method types, app settings, menu actions
  git.ts, github.ts, ai.ts, themes/
test/                     Fixtures (minimal-repo/)
e2e/                      Playwright specs
```

**Data flow**: Renderer hooks → `window.gitfreddo.invoke` → `electron/main` → `repo-manager` → `git/operations` → shared types.

## Key Conventions

| Rule | Detail |
|------|--------|
| **Pure logic** | Keep in `src/lib/` or `electron/git/operations/` — not in components |
| **New IPC** | 1. Add types in `shared/ipc.ts` 2. Handler in main 3. Expose via preload 4. Wrap in hook |
| **Data flow** | Renderer → IPC → Main → Repo Manager → Git Operations → Shared Types |
| **Naming** | PascalCase for component folders, kebab-case for files, camelCase for functions |

## TDD Workflow (Strict Red-Green-Refactor)

**For every behavior change:**

1. **Red** — Write a failing test describing desired behavior. Run `npm run test` and confirm it fails for the right reason.
2. **Green** — Write the minimal change to make it pass. Run `npm run test` again.
3. **Refactor** — Clean up while keeping tests green. Never skip red or green.

### Test Locations

| Code under test | Test file | Runner |
|-----------------|-----------|--------|
| `src/lib/**/*.ts` | Co-located `*.test.ts` | Vitest (node) |
| `electron/**/*.ts` | Co-located `*.test.ts` | Vitest (node) |
| `shared/**/*.ts` | Co-located `*.test.ts` | Vitest (node) |
| `src/components/**/*.tsx` | Co-located `*.test.tsx` | Vitest (jsdom) |
| App smoke path | `e2e/app-smoke.spec.ts` | Playwright (after `npm run build`) |

### Test Helpers
- `src/test/setup.ts` — jest-dom matchers, global mocks
- `src/test/mocks/gitfreddo.ts` — IPC stub
- `src/test/render.tsx` — `renderWithProviders` wrapper
- Fixtures: `test/fixtures/minimal-repo/`

### Test Guidelines
- Prefer pure functions and parsers over full UI flows
- Component tests: mock `window.gitfreddo`, wrap with `renderWithProviders`
- No network calls in unit tests; keep fixtures deterministic
- E2E: use `page.evaluate()` for IPC — avoid native file dialogs

## Required Checks Before Finishing

**Always run (matches CI `test` job):**
```bash
npm run typecheck
npm run test:coverage
npm run build
npm run smoke
```

**Also run when relevant:**

| Change scope | Extra command |
|--------------|---------------|
| App startup, IPC, preload, main window, repo connect, timeline/sidebar load | `npm run test:e2e` (after `build`) |
| Only pure logic with co-located unit tests | `vitest run path/to/module.test.ts` during TDD; full suite before finish |

**Fix any failure before finishing.** If a check cannot run locally, state which CI step may still fail.

## Session Logging

After substantive work, update **both** logs before ending the turn (skip for pure Q&A, exploration, or if user says not to).

### CHANGELOG.md (commit/PR log)
- Append under `## [Unreleased]` (newest dated entries at top)
- Don't put unfinished work under a released version heading
- Release sections use git tags: `## [X.Y.Z]` matches tag `vX.Y.Z`
- On release: move applicable `[Unreleased]` items into `## [X.Y.Z] - YYYY-MM-DD`, leave `[Unreleased]` for ongoing work
- Preserve older tag sections unless asked to rewrite

**Session entry format:**
```markdown
### YYYY-MM-DD — short title

- **Why:** user intent / problem being solved
- **What:** concise bullets of what changed (areas/files, behavior)
```

### NEWS.md (startup modal "Latest News")
- Same tag sections as changelog: `[Unreleased]` then `## [X.Y.Z]` (newest first)
- Bullets are **short, user-facing highlights** — not internal commit notes
- When a user-visible feature ships, add a bullet under `[Unreleased]` (or update existing)
- Skip pure refactors, tests-only, infra unless user would care on startup
- Mentally cap at ~3–5 bullets; trim or fold older ones when promoting on release
- On release tag: move/promote `[Unreleased]` news into `## [X.Y.Z]`

## Useful Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Electron with hot reload |
| `npm run build` | Production build to `out/` |
| `npm run typecheck` | TypeScript check (web + node) |
| `npm run test` | Unit + component tests |
| `npm run test:coverage` | Coverage report (thresholds enforced) |
| `npm run test:e2e` | Electron smoke test (Playwright) |
| `npm run smoke` | Git backend shell smoke test |
| `npm run dist` | Package installers |
| `npm run check-i18n` | Validate i18n keys |

## Documentation References

- **Architecture & IPC**: `docs/architecture.md`
- **Full codebase map**: `docs/codebase-map.md`
- **Testing conventions**: `docs/contributing/testing.md`
- **Contributing guide**: `docs/contributing/contributing.md`
- **i18n guide**: `docs/contributing/i18n.md`
- **Workflows**: `docs/workflows/*.md`