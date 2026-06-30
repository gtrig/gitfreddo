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
- AI assist for commit and stash messages (local LLM or cloud API)

Settings are stored in `~/.config/gitfredo/settings.json`.

## AI assist

Configure under **Settings → AI assist**:

- **Local LLM** — OpenAI-compatible server (e.g. LM Studio at `http://localhost:1234`, Ollama at `http://localhost:11434`)
- **Cloud API** — Any OpenAI-compatible endpoint with an API key

When configured, text fields show a star button to generate content from staged or working-tree diffs. Use **Ctrl+Shift+Space** while focused to trigger fill.

API keys are stored locally in `~/.config/gitfredo/settings.json`.

## Architecture

See [docs/architecture.md](docs/architecture.md).
