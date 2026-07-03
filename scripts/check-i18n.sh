#!/usr/bin/env bash
# Regression guard: flag likely hardcoded JSX text in i18n-migrated directories.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIRS=(
  "$ROOT/src/components/TimelineGraph"
  "$ROOT/src/components/WorkingTree"
  "$ROOT/src/components/DiffViewer"
  "$ROOT/src/components/MergeConflicts"
  "$ROOT/src/components/DetailPanel"
)

violations=0

for dir in "${DIRS[@]}"; do
  [[ -d "$dir" ]] || continue

  while IFS= read -r file; do
    [[ "$file" == *.test.tsx ]] && continue

    while IFS= read -r match; do
      line="${match%%:*}"
      text="${match#*:}"
      text="${text#*\"}"
      text="${text%\"*}"

      # Skip empty, whitespace-only, or single-character labels
      [[ -z "${text//[[:space:]]/}" ]] && continue
      [[ ${#text} -le 1 ]] && continue

      # Skip lines that already use i18n or non-user-facing patterns
      if [[ "$match" == *"t("* ]] \
        || [[ "$match" == *"className"* ]] \
        || [[ "$match" == *"aria-"* ]] \
        || [[ "$match" == *"data-"* ]] \
        || [[ "$match" == *"type=\""* ]] \
        || [[ "$match" == *"key=\""* ]] \
        || [[ "$match" == *"id=\""* ]] \
        || [[ "$match" == *"placeholder=\""* ]] \
        || [[ "$match" == *"title=\""* ]] \
        || [[ "$match" == *"href=\""* ]] \
        || [[ "$match" == *"src=\""* ]] \
        || [[ "$match" == *"import "* ]] \
        || [[ "$match" == *"from \""* ]] \
        || [[ "$match" == *"//"* ]] \
        || [[ "$match" == *"/*"* ]]; then
        continue
      fi

      # Skip git paths, hashes, and numeric-only fragments
      [[ "$text" =~ ^[0-9.+\\-]+$ ]] && continue
      [[ "$text" =~ ^[a-f0-9]{7,40}$ ]] && continue

      echo "$file:$line: likely hardcoded JSX text: \"$text\""
      violations=$((violations + 1))
    done < <(rg -n --pcre2 '>\s*[A-Za-z][^<{]*<' "$file" 2>/dev/null || true)

    while IFS= read -r match; do
      line="${match%%:*}"
      text="${match#*:}"
      text="${text#*\"}"
      text="${text%\"*}"

      [[ -z "${text//[[:space:]]/}" ]] && continue

      if [[ "$match" == *"t("* ]] \
        || [[ "$match" == *"className"* ]] \
        || [[ "$match" == *"aria-"* ]] \
        || [[ "$match" == *"placeholder=\""* ]] \
        || [[ "$match" == *"title=\""* ]] \
        || [[ "$match" == *"//"* ]]; then
        continue
      fi

      echo "$file:$line: likely hardcoded attribute text: \"$text\""
      violations=$((violations + 1))
    done < <(rg -n --pcre2 '(label|confirmLabel|message|emptyMessage)=\{?\"[A-Za-z][^\"]{2,}\"' "$file" 2>/dev/null || true)
  done < <(find "$dir" -maxdepth 1 -name '*.tsx' -print)
done

if [[ "$violations" -gt 0 ]]; then
  echo ""
  echo "Found $violations likely i18n violation(s)."
  exit 1
fi

echo "No likely hardcoded UI strings found in migrated directories."
exit 0
