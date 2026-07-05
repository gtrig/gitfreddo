import { describe, expect, it } from 'vitest'
import { applyUpdateChannel, reduceUpdateState } from './update'

describe('reduceUpdateState', () => {
  const base = { status: 'idle' as const, currentVersion: '0.2.8' }

  it('tracks available update', () => {
    const next = reduceUpdateState(base, { type: 'available', version: '0.3.0' })
    expect(next.status).toBe('available')
    expect(next.availableVersion).toBe('0.3.0')
  })

  it('tracks download progress and completion', () => {
    let state = reduceUpdateState(base, { type: 'available', version: '0.3.0' })
    state = reduceUpdateState(state, { type: 'progress', percent: 42 })
    expect(state.status).toBe('downloading')
    expect(state.progressPercent).toBe(42)
    state = reduceUpdateState(state, { type: 'downloaded', version: '0.3.0' })
    expect(state.status).toBe('downloaded')
  })

  it('maps errors', () => {
    const next = reduceUpdateState(base, { type: 'error', message: 'network' })
    expect(next.status).toBe('error')
    expect(next.errorMessage).toBe('network')
  })
})

describe('applyUpdateChannel', () => {
  it('enables prerelease only for beta', () => {
    expect(applyUpdateChannel('stable').allowPrerelease).toBe(false)
    expect(applyUpdateChannel('beta').allowPrerelease).toBe(true)
  })
})
