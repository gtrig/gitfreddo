import { describe, expect, it } from 'vitest'
import {
  forgeConnectKey,
  forgeDisplayName,
  forgeNotLinkedKey
} from './useForgeContext'

describe('useForgeContext helpers', () => {
  it('maps forge providers to connect keys', () => {
    expect(forgeConnectKey('github')).toBe('sidebar.connectGitHub')
    expect(forgeConnectKey('bitbucket')).toBe('sidebar.connectBitbucket')
    expect(forgeConnectKey(null)).toBe('sidebar.connectForge')
  })

  it('maps forge providers to not-linked keys', () => {
    expect(forgeNotLinkedKey('github')).toBe('sidebar.notLinkedGitHub')
    expect(forgeNotLinkedKey('bitbucket')).toBe('sidebar.notLinkedBitbucket')
    expect(forgeNotLinkedKey(null)).toBe('sidebar.notLinkedForge')
  })

  it('returns display names for forges', () => {
    expect(forgeDisplayName('github')).toBe('GitHub')
    expect(forgeDisplayName('bitbucket')).toBe('Bitbucket')
    expect(forgeDisplayName(null)).toBe('GitHub')
  })
})
