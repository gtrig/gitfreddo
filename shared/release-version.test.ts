import { describe, expect, it } from 'vitest'
import { normalizeReleaseTag } from './release-version'

describe('normalizeReleaseTag', () => {
  it('adds a v prefix when missing', () => {
    expect(normalizeReleaseTag('1.2.3')).toBe('v1.2.3')
  })

  it('keeps an existing v prefix', () => {
    expect(normalizeReleaseTag('v1.2.3-beta.1')).toBe('v1.2.3-beta.1')
  })

  it('rejects invalid tags', () => {
    expect(normalizeReleaseTag('latest')).toBeNull()
  })
})
