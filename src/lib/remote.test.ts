import { describe, expect, it } from 'vitest'
import { remoteNameFromUpstream, resolveDefaultRemote } from './remote'

describe('remoteNameFromUpstream', () => {
  it('extracts the remote name before the first slash', () => {
    expect(remoteNameFromUpstream('gitfreddo/main')).toBe('gitfreddo')
  })
})

describe('resolveDefaultRemote', () => {
  it('uses the configured remote when it exists', () => {
    expect(resolveDefaultRemote('origin', [{ name: 'origin' }])).toBe('origin')
  })

  it('falls back to the current branch upstream remote', () => {
    expect(
      resolveDefaultRemote('origin', [{ name: 'gitfreddo' }], 'gitfreddo/main')
    ).toBe('gitfreddo')
  })

  it('uses the only configured remote when settings remote is missing', () => {
    expect(resolveDefaultRemote('origin', [{ name: 'gitfreddo' }])).toBe('gitfreddo')
  })
})
