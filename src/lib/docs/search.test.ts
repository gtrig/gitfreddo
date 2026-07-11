import { describe, expect, it } from 'vitest'
import type { DocSection } from '@/lib/docs/catalog'
import { filterDocSections, docPageMatchesQuery } from '@/lib/docs/search'

const sections: DocSection[] = [
  {
    id: 'start',
    titleKey: 'docs.sections.start',
    pages: [{ path: 'README.md' }, { path: 'getting-started.md' }]
  },
  {
    id: 'setup',
    titleKey: 'docs.sections.setup',
    pages: [{ path: 'setup/github.md' }]
  }
]

const titles: Record<string, string> = {
  'README.md': 'GitFreddo documentation',
  'getting-started.md': 'Getting started',
  'setup/github.md': 'GitHub integration'
}

const contents: Record<string, string> = {
  'README.md': 'Welcome to GitFreddo.',
  'getting-started.md': 'Install Node.js and clone the repository.',
  'setup/github.md': 'Connect GitHub for pull requests and issues.'
}

describe('docPageMatchesQuery', () => {
  it('matches titles case-insensitively', () => {
    expect(docPageMatchesQuery('GitHub integration', 'Pull requests guide', 'Body text', 'github')).toBe(
      true
    )
  })

  it('matches page content case-insensitively', () => {
    expect(docPageMatchesQuery('Guide', 'Setup', 'Configure pull requests in Settings.', 'pull requests')).toBe(
      true
    )
  })

  it('returns true for blank queries', () => {
    expect(docPageMatchesQuery('Guide', 'Setup', 'Body', '   ')).toBe(true)
  })
})

describe('filterDocSections', () => {
  it('returns all sections when the query is empty', () => {
    expect(filterDocSections(sections, '', titles, contents)).toEqual(sections)
  })

  it('filters pages by title matches', () => {
    const filtered = filterDocSections(sections, 'getting started', titles, contents)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.pages.map((page) => page.path)).toEqual(['getting-started.md'])
  })

  it('filters pages by content matches', () => {
    const filtered = filterDocSections(sections, 'pull requests', titles, contents)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.pages.map((page) => page.path)).toEqual(['setup/github.md'])
  })

  it('drops sections with no matching pages', () => {
    const filtered = filterDocSections(sections, 'roadmap', titles, contents)
    expect(filtered).toEqual([])
  })
})
