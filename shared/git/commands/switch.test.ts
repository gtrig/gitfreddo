import { describe, expect, it } from 'vitest'
import { buildSwitchCheckoutArgs } from './switch'

describe('buildSwitchCheckoutArgs', () => {
  it('builds detach checkout args', () => {
    expect(buildSwitchCheckoutArgs({ name: 'abc123', detach: true })).toEqual([
      'switch',
      '--detach',
      '--end-of-options',
      'abc123'
    ])
  })

  it('builds branch checkout args', () => {
    expect(buildSwitchCheckoutArgs({ name: 'feature/login', detach: false })).toEqual([
      'switch',
      '--end-of-options',
      'feature/login'
    ])
  })
})
