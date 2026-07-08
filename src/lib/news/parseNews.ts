export interface ParseNewsOptions {
  /** Prefer `[Unreleased]` when it has bullets (default true). */
  preferUnreleased?: boolean
  /** Max bullets to return (default unlimited). */
  maxItems?: number
}

/**
 * Parse startup-modal bullets from NEWS.md (tag sections like CHANGELOG).
 * Newest sections first; prefer Unreleased when it has items.
 */
export function parseNewsItems(markdown: string, options: ParseNewsOptions = {}): string[] {
  const preferUnreleased = options.preferUnreleased !== false
  const sections = splitTagSections(markdown)

  const unreleased = sections.find((s) => s.tag.toLowerCase() === 'unreleased')
  const releases = sections.filter((s) => s.tag.toLowerCase() !== 'unreleased')

  let items: string[] = []
  if (preferUnreleased && unreleased && unreleased.items.length > 0) {
    items = unreleased.items
  } else if (releases.length > 0) {
    items = releases[0].items
  } else if (unreleased) {
    items = unreleased.items
  }

  if (options.maxItems != null) {
    return items.slice(0, options.maxItems)
  }
  return items
}

interface NewsSection {
  tag: string
  items: string[]
}

function splitTagSections(markdown: string): NewsSection[] {
  const lines = markdown.split(/\r?\n/)
  const sections: NewsSection[] = []
  let current: NewsSection | null = null

  for (const line of lines) {
    const heading = line.match(/^##\s+\[([^\]]+)\]/)
    if (heading) {
      current = { tag: heading[1].trim(), items: [] }
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
