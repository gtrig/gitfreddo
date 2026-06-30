import { describe, expect, it } from 'vitest'
import { repoNameFromUrl } from './git'

describe('repoNameFromUrl', () => {
  it('extracts name from https URL', () => {
    expect(repoNameFromUrl('https://github.com/org/my-repo.git')).toBe('my-repo')
  })

  it('extracts name from ssh URL', () => {
    expect(repoNameFromUrl('git@github.com:org/my-repo.git')).toBe('my-repo')
  })

  it('handles URL without .git suffix', () => {
    expect(repoNameFromUrl('https://github.com/org/my-repo')).toBe('my-repo')
  })
})
