import { describe, expect, it } from 'vitest'
import { getDocContent, getDocTitle } from './content'

describe('doc content bundle', () => {
  it('loads the docs index', () => {
    const content = getDocContent('README.md')
    expect(content).toContain('GitFreddo documentation')
  })

  it('loads nested guides', () => {
    const content = getDocContent('setup/github.md')
    expect(content).toContain('#')
  })

  it('derives titles from headings', () => {
    expect(getDocTitle('getting-started.md')).toBe('Getting started')
  })
})
