# AI assistant setup

GitFreddo can generate commit messages, stash messages, composed commits, and conflict resolutions using an OpenAI-compatible API.

Open **Settings → AI assist** to configure.

## Providers

### Local LLM (recommended for privacy)

Runs entirely on your machine. No data leaves your computer.

| Server | Default URL |
|--------|-------------|
| LM Studio | `http://localhost:1234` |
| Ollama | `http://localhost:11434` |

1. Start your local server and load a model
2. Select **Local LLM** in settings
3. Set **Base URL** to your server address
4. Pick a **Model** from the dropdown (loaded after URL is set)

### Cloud API

Any OpenAI-compatible endpoint (OpenAI, OpenRouter, etc.).

1. Select **Cloud API** in settings
2. Set **Base URL** (e.g. `https://api.openai.com`)
3. Enter your **API key** — stored in `~/.config/gitfreddo/settings.json`

## Instruction fields

Customize how the AI responds:

| Field | Purpose |
|-------|---------|
| System instructions | General behavior for all AI calls |
| Commit instructions | Style and format for commit messages |
| Stash instructions | Style for stash messages |
| Conflict instructions | How to resolve merge conflicts |

Leave blank to use sensible defaults.

## Using AI assist in the UI

### Commit and stash messages

When AI is configured, text fields show a **star** button. Click it to generate content from staged or working-tree diffs.

**Keyboard shortcut:** **Ctrl+Shift+Space** while focused on a text field.

Works in:

- Commit message box
- Stash message dialog
- Compose commits modal

### Conflict resolution

During a merge, rebase, or cherry-pick conflict:

1. Open the conflict resolver (sidebar panel or diff overlay)
2. Click **Resolve with AI** on a conflict hunk
3. Review the proposal and confidence score
4. Accept or edit before saving

## Privacy

- **Local LLM:** diffs are sent only to your local server
- **Cloud API:** file diffs and conflict content are sent to the configured endpoint
- API keys and settings are stored locally; nothing is sent to GitFreddo servers

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No models in dropdown | Check server is running; verify base URL |
| "AI response was not valid JSON" | Try a different model or adjust instructions |
| Slow responses | Use a smaller local model or reduce staged diff size |
| API key errors | Verify key and base URL; check `/v1` path is correct |

## Next

- [Everyday Git workflow](../workflows/01-everyday.md) — stage and commit with AI messages
- [Conflicts workflow](../workflows/08-conflicts.md) — AI-assisted conflict resolution
