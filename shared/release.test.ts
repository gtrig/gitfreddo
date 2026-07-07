import { describe, expect, it } from 'vitest'
import { versionFromReleaseTag } from './release'

describe('versionFromReleaseTag', () => {
  it('strips a leading v from release tags', () => {
    expect(versionFromReleaseTag('v1.2.3')).toBe('1.2.3')
  })

  it('accepts semver tags without a v prefix', () => {
    expect(versionFromReleaseTag('1.2.3')).toBe('1.2.3')
  })

  it('supports prerelease tags', () => {
    expect(versionFromReleaseTag('v1.2.3-beta.1')).toBe('1.2.3-beta.1')
  })

  it('rejects invalid tags', () => {
    expect(versionFromReleaseTag('')).toBeNull()
    expect(versionFromReleaseTag('latest')).toBeNull()
    expect(versionFromReleaseTag('v1.2')).toBeNull()
  })
})
