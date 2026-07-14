# Release

Run every CI-equivalent check, then perform the local prerelease steps: bump the app version, promote changelog/news notes, and create the git tag.

Target version: **$ARGUMENTS** (a semver tag like `vX.Y.Z`). If no version was given, ask which version to release (or infer the next patch/minor from `package.json` and confirm) before doing anything else.

## 1. Preflight

- Confirm the working tree is clean (`git status`). If there are uncommitted changes, stop and ask how to proceed — do not stash or discard silently.
- Confirm you are on the intended release branch and note the current `package.json` version.
- Validate the tag looks like `vX.Y.Z` (optionally with a prerelease/build suffix). Reject anything else.

## 2. Run all checks (must all pass)

Run the full CI `test` job locally, in order. Fix any failure before continuing — never proceed to tagging with a red check.

```bash
npm run typecheck
npm run test:coverage
npm run build
npm run smoke
```

Then run the E2E smoke path (build already ran above):

```bash
npm run test:e2e
```

If any check fails, stop, report the failure, and fix it (following strict TDD for behavior changes) before resuming the release. Re-run the affected checks after fixing.

## 3. Prerelease actions

Only after every check is green:

1. **Bump the version** to the tag:

```bash
npm run release:prepare -- $ARGUMENTS
```

   This syncs `package.json` and `package-lock.json` to the tag version. Confirm the reported version matches the tag.

2. **Promote the notes.** Move the `## [Unreleased]` entries in `CHANGELOG.md` and `NEWS.md` into a new released section for this version:
   - `CHANGELOG.md`: create `## [X.Y.Z] - YYYY-MM-DD` (today's date) directly below `[Unreleased]`, move the applicable entries into it, and leave `[Unreleased]` empty for ongoing work. Add the release-tag reference link at the bottom of the file (e.g. `[X.Y.Z]: https://github.com/gtrig/gitfreddo/releases/tag/vX.Y.Z`).
   - `NEWS.md`: promote the user-facing `[Unreleased]` bullets into `## [X.Y.Z]` (same tag-section convention), trimming to the highlights users care about.

3. **Commit** the release changes:

```bash
git add package.json package-lock.json CHANGELOG.md NEWS.md
git commit -m "chore: release $ARGUMENTS"
```

4. **Create the tag** (annotated) on that commit:

```bash
git tag $ARGUMENTS
```

## 4. Report — do NOT push

Stop after creating the tag. Do **not** run `git push` (branch or tag) unless the user explicitly asks — pushing a `v*` tag triggers the release build.

Summarize:
- The version bump (old → new) and files changed.
- Confirmation that all checks passed.
- The exact push commands the user can run next:

```bash
git push origin HEAD && git push origin $ARGUMENTS
```

The `pre-push` hook re-runs `typecheck`/`test` and blocks the tag push unless `package.json` already matches the tag, which the steps above ensure.
