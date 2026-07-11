import type { DocSection } from '@/lib/docs/catalog'

export function docPageMatchesQuery(
  title: string,
  _path: string,
  content: string,
  query: string
): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  const haystack = `${title}\n${content}`.toLowerCase()
  return haystack.includes(normalized)
}

export function filterDocSections(
  sections: DocSection[],
  query: string,
  titlesByPath: Record<string, string>,
  contentsByPath: Record<string, string>
): DocSection[] {
  const normalized = query.trim()
  if (!normalized) {
    return sections
  }

  return sections
    .map((section) => ({
      ...section,
      pages: section.pages.filter((page) => {
        const title = titlesByPath[page.path] ?? page.path
        const content = contentsByPath[page.path] ?? ''
        return docPageMatchesQuery(title, page.path, content, normalized)
      })
    }))
    .filter((section) => section.pages.length > 0)
}
