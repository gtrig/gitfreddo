import { describe, expect, it } from 'vitest'
import { parseNewsVersionUpdates } from '@/lib/news/parseNews'

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

describe('parseNewsVersionUpdates', () => {
  it('returns the newest non-empty version sections in order', () => {
    expect(parseNewsVersionUpdates(SAMPLE, { maxVersions: 2 })).toEqual([
      {
        version: 'Unreleased',
        items: ['Bitbucket forge auth polish in progress']
      },
      {
        version: '0.3.3',
        items: [
          'Faster timeline rendering for large repositories.',
          'Improved GitHub flows for pull requests and issues.',
          'Expanded AI assistance for commit messages and conflict help.'
        ]
      }
    ])
  })

  it('skips empty Unreleased and continues with recent releases', () => {
    const md = `# News

## [Unreleased]

## [0.3.3]

- First highlight
- Second highlight

## [0.2.0]

- Old highlight
`
    expect(parseNewsVersionUpdates(md, { maxVersions: 2 })).toEqual([
      {
        version: '0.3.3',
        items: ['First highlight', 'Second highlight']
      },
      {
        version: '0.2.0',
        items: ['Old highlight']
      }
    ])
  })

  it('caps the number of version sections at maxVersions', () => {
    expect(parseNewsVersionUpdates(SAMPLE, { maxVersions: 1 })).toEqual([
      {
        version: 'Unreleased',
        items: ['Bitbucket forge auth polish in progress']
      }
    ])
  })

  it('defaults to three version sections', () => {
    const updates = parseNewsVersionUpdates(SAMPLE)
    expect(updates).toHaveLength(3)
    expect(updates.map((u) => u.version)).toEqual(['Unreleased', '0.3.3', '0.2.0'])
  })

  it('returns an empty list for empty input', () => {
    expect(parseNewsVersionUpdates('')).toEqual([])
  })
})
