import { describe, expect, it } from 'vitest'
import {
  findReleaseTagVersionMismatches,
  normalizeReleaseTag,
  packageVersionMatchesReleaseTag,
  parseReleaseTagsFromPrePush
} from './release-version'

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

describe('packageVersionMatchesReleaseTag', () => {
  it('matches when package.json version equals the tag semver', () => {
    expect(packageVersionMatchesReleaseTag('v0.3.5', '0.3.5')).toBe(true)
    expect(packageVersionMatchesReleaseTag('0.3.5', '0.3.5')).toBe(true)
  })

  it('rejects mismatched versions', () => {
    expect(packageVersionMatchesReleaseTag('v0.3.5', '0.3.0')).toBe(false)
  })

  it('rejects invalid tags', () => {
    expect(packageVersionMatchesReleaseTag('latest', '0.3.5')).toBe(false)
  })
})

describe('parseReleaseTagsFromPrePush', () => {
  it('extracts release tags being pushed', () => {
    const input = [
      'refs/heads/main abc123 refs/heads/main def456',
      'refs/tags/v0.3.5 111111 refs/tags/v0.3.5 222222'
    ].join('\n')

    expect(parseReleaseTagsFromPrePush(input)).toEqual(['v0.3.5'])
  })

  it('ignores branch pushes and tag deletions', () => {
    const input = [
      'refs/heads/main abc123 refs/heads/main 0000000000000000000000000000000000000000',
      'refs/tags/v0.3.4 0000000000000000000000000000000000000000 deadbeef refs/tags/v0.3.4'
    ].join('\n')

    expect(parseReleaseTagsFromPrePush(input)).toEqual([])
  })

  it('includes new tags whose remote side is unset', () => {
    const input =
      'refs/tags/v0.3.5 abc123 refs/tags/v0.3.5 0000000000000000000000000000000000000000'

    expect(parseReleaseTagsFromPrePush(input)).toEqual(['v0.3.5'])
  })

  it('skips malformed lines and non-release tag refs', () => {
    const input = [
      '',
      'refs/tags/v0.3.5',
      'refs/tags/feature-flag abc123 refs/tags/feature-flag def456',
      'refs/tags/v0.3.6 0000000000000000000000000000000000000000 refs/tags/v0.3.6 def456'
    ].join('\n')

    expect(parseReleaseTagsFromPrePush(input)).toEqual([])
  })
})

describe('findReleaseTagVersionMismatches', () => {
  it('returns tags whose semver does not match package.json', () => {
    expect(findReleaseTagVersionMismatches(['v0.3.5', 'v0.3.0', 'latest'], '0.3.5')).toEqual([
      'v0.3.0',
      'latest'
    ])
  })
})
