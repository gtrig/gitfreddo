# Conflicts

Resolve merge, rebase, and cherry-pick conflicts with the built-in 3-way resolver and optional AI assistance.

## When conflicts appear

GitFreddo detects conflicts during:

- **Merge** (no-ff or squash)
- **Rebase** (standard or interactive)
- **Cherry-pick**

A banner or sidebar panel indicates conflicted files. The action bar may show **Continue** or **Abort** options.

## Conflict panel

The **Merge conflicts** panel lists all conflicted files. Click a file to open the resolver.

## 3-way resolver

For each conflict hunk you see:

| Pane | Content |
|------|---------|
| Base | Common ancestor |
| Ours | Current branch version |
| Theirs | Incoming version |
| Output | Your resolution (editable) |

Per-hunk actions:

- **Ours** — keep current branch version
- **Theirs** — keep incoming version
- **Both** — include both sides
- Edit the output pane manually for custom merges

Save resolves the hunk and stages the file.

## Continue or abort

When all conflicts are resolved and staged:

- **Continue** — `git merge --continue`, `git rebase --continue`, or `git cherry-pick --continue`
- **Abort** — cancel the operation and return to the pre-operation state

## AI-assisted resolution

With [AI assist](../setup/ai-assistant.md) configured:

1. Open a conflicted file in the resolver
2. Click **Resolve with AI** on a hunk
3. Review the proposal and **confidence** score
4. **Accept** to apply, or edit before saving

AI analyzes the base, ours, and theirs content to suggest merged output.

## Conflict markers

If saved files still contain `<<<<<<<` markers, GitFreddo warns before continuing. Resolve all markers before continuing the operation.

## Tips

- Resolve one file at a time; staged resolutions persist across sessions
- Use the diff overlay to compare full files side by side
- For complex conflicts, resolve in an external editor via **Settings → Interface**

## Previous

[History rewriting](05-history-rewriting.md) — operations that commonly cause conflicts
