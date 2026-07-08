import { describe, expect, it } from 'vitest'
import { parseNewsItems } from '@/lib/news/parseNews'

const SAMPLE = `# News

Startup-modal highlights. Newest tag section first.

## [Unreleased]

- Bitbucket forge auth polish in progress

## [0.3.3]

- Faster timeline rendering for large repositories.
- Improved GitHub flows for pull requests and issues.
- Expanded AI assistance for commit messages and conflict help.

## [0.2.0]

- Initial public release highlights
`

describe('parseNewsItems', () => {
  it('returns bullets from Unreleased when that section has items', () => {
    expect(parseNewsItems(SAMPLE)).toEqual([
      'Bitbucket forge auth polish in progress'
    ])
  })

  it('falls back to the newest release section when Unreleased is empty', () => {
    const md = `# News

## [Unreleased]

## [0.3.3]

- First highlight
- Second highlight

## [0.2.0]

- Old highlight
`
    expect(parseNewsItems(md)).toEqual(['First highlight', 'Second highlight'])
  })

  it('caps items at maxItems', () => {
    expect(parseNewsItems(SAMPLE, { preferUnreleased: false, maxItems: 2 })).toEqual([
      'Faster timeline rendering for large repositories.',
      'Improved GitHub flows for pull requests and issues.'
    ])
  })

  it('returns an empty list for empty input', () => {
    expect(parseNewsItems('')).toEqual([])
  })
})
