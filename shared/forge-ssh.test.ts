import { describe, expect, it } from 'vitest'
import {
  findGitFreddoSshKeyLabel,
  isGitFreddoSshKeyLabel,
  sshKeyTitleFromSettings
} from './forge-ssh'

describe('forge ssh helpers', () => {
  it('detects GitFreddo ssh key labels', () => {
    expect(isGitFreddoSshKeyLabel('GitFreddo 2026-07-08T06:00:00.000Z')).toBe(true)
    expect(isGitFreddoSshKeyLabel('laptop')).toBe(false)
  })

  it('returns the first matching GitFreddo ssh key label', () => {
    expect(
      findGitFreddoSshKeyLabel(['work laptop', 'GitFreddo 2026-07-08T06:00:00.000Z'])
    ).toBe('GitFreddo 2026-07-08T06:00:00.000Z')
  })

  it('normalizes stored ssh key titles for status payloads', () => {
    expect(sshKeyTitleFromSettings('GitFreddo key')).toBe('GitFreddo key')
    expect(sshKeyTitleFromSettings('  GitFreddo key  ')).toBe('GitFreddo key')
    expect(sshKeyTitleFromSettings('')).toBe(null)
    expect(sshKeyTitleFromSettings('   ')).toBe(null)
    expect(sshKeyTitleFromSettings(null)).toBe(null)
    expect(sshKeyTitleFromSettings(undefined)).toBe(null)
  })
})
