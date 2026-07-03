import { describe, expect, it } from 'vitest'
import { isNonFastForwardPushError, remoteNameFromUpstream, resolveDefaultRemote } from '@/lib/git/remote'

describe('remoteNameFromUpstream', () => {
  it('extracts the remote name before the first slash', () => {
    expect(remoteNameFromUpstream('gitfreddo/main')).toBe('gitfreddo')
  })
})

describe('isNonFastForwardPushError', () => {
  it('detects non-fast-forward rejections', () => {
    const message =
      '! [rejected] main -> main (non-fast-forward)\nerror: failed to push some refs'
    expect(isNonFastForwardPushError(new Error(message))).toBe(true)
  })

  it('ignores other push errors', () => {
    expect(isNonFastForwardPushError(new Error('authentication failed'))).toBe(false)
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
