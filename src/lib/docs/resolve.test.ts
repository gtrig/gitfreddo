import { describe, expect, it } from 'vitest'
import { resolveDocLink } from './resolve'

describe('resolveDocLink', () => {
  it('resolves sibling paths', () => {
    expect(resolveDocLink('getting-started.md', 'setup/github.md')).toBe('setup/github.md')
  })

  it('resolves relative paths from nested docs', () => {
    expect(resolveDocLink('workflows/01-everyday.md', '../setup/github.md')).toBe('setup/github.md')
  })

  it('returns null for external links', () => {
    expect(resolveDocLink('README.md', 'https://github.com/gtrig/gitfreddo')).toBeNull()
  })

  it('returns null for anchor-only links', () => {
    expect(resolveDocLink('README.md', '#section')).toBeNull()
  })

  it('resolves changelog link from docs index', () => {
    expect(resolveDocLink('README.md', '../CHANGELOG.md')).toBe('CHANGELOG.md')
  })
})
