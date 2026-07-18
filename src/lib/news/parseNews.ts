export interface NewsVersionUpdate {
  /** Tag label from `## [X.Y.Z]` / `## [Unreleased]` (no brackets). */
  version: string
  items: string[]
}

export interface ParseNewsOptions {
  /** Max non-empty version sections to return (default 3). */
  maxVersions?: number
}

/**
 * Parse recent version updates from NEWS.md for the startup modal.
 * Newest sections first; empty sections are skipped. Content is taken as-is
 * (no i18n) — edit NEWS.md to change what users see.
 */
export function parseNewsVersionUpdates(
  markdown: string,
  options: ParseNewsOptions = {}
): NewsVersionUpdate[] {
  const maxVersions = options.maxVersions ?? 3
  const sections = splitTagSections(markdown).filter((s) => s.items.length > 0)
  return sections.slice(0, maxVersions)
}

function splitTagSections(markdown: string): NewsVersionUpdate[] {
  const lines = markdown.split(/\r?\n/)
  const sections: NewsVersionUpdate[] = []
  let current: NewsVersionUpdate | null = null

  for (const line of lines) {
    const heading = line.match(/^##\s+\[([^\]]+)\]/)
    if (heading) {
      current = { version: heading[1].trim(), items: [] }
      sections.push(current)
      continue
    }
    if (!current) continue

    const bullet = line.match(/^\s*[-*]\s+(.+)$/)
    if (bullet) {
      const text = bullet[1].trim()
      if (text) current.items.push(text)
    }
  }

  return sections
}
