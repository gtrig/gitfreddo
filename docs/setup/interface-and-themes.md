# Interface and themes

Customize appearance, refresh behavior, and default views.

Open **Settings → Interface** to configure.

## Theme

GitFreddo includes 11 themes in dark and light modes:

| Mode | Themes |
|------|--------|
| Dark | dark, freddo, midnight, sage, lavender, dusk |
| Light | paper, cloud, blossom, mint, sand |

Select a theme from the dropdown. Changes apply immediately.

## Poll interval

**Poll interval (ms)** controls how often GitFreddo refreshes repository status in the background.

- Default: `5000` (5 seconds)
- Set to `0` to disable automatic polling (manual refresh only)

## Commit graph max commits

Limits how many commits load in the timeline graph. Default: `500`. Increase for large histories; decrease for faster loads on slow machines.

## Default diff view

Choose the initial diff mode when opening a diff overlay:

| Mode | Description |
|------|-------------|
| Unified | Single column with `+`/`-` lines |
| Side by side | Old and new columns |
| Word diff | Inline word-level highlights |

You can switch modes inside the diff viewer without changing this default.

## External editor command

Optional command to open files externally (e.g. `code --wait` for VS Code). Used when choosing "Open in editor" from the working tree.

## Language

Select **English** or **Ελληνικά** (Greek) for the application UI. The choice is saved in settings and applies on next interaction.

Git output (branch names, commit messages, porcelain) is not translated.

## Next

- [Getting started](../getting-started.md) — first launch
- [Everyday Git workflow](../workflows/01-everyday.md) — using the main UI
