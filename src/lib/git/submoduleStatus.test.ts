import { describe, expect, it } from 'vitest'
import { submoduleRowLabel, submoduleStatusLabel } from './submoduleStatus'

describe('submoduleStatus', () => {
  it('labels submodule states', () => {
    expect(submoduleStatusLabel('initialized')).toBe('S')
    expect(submoduleStatusLabel('uninitialized')).toBe('S?')
    expect(submoduleStatusLabel('dirty')).toBe('S~')
    expect(submoduleStatusLabel('ahead')).toBe('S+')
    expect(submoduleStatusLabel('behind')).toBe('S-')
  })

  it('formats row labels', () => {
    expect(submoduleRowLabel('vendor/lib', 'main')).toBe('vendor/lib (main)')
    expect(submoduleRowLabel('vendor/lib')).toBe('vendor/lib')
  })
})
