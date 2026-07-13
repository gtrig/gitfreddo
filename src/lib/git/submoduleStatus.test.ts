import { describe, expect, it } from 'vitest'
import { submoduleRowLabel, submoduleStatusColor, submoduleStatusLabel } from './submoduleStatus'

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

  it('maps submodule states to colors', () => {
    expect(submoduleStatusColor('initialized')).toContain('sky')
    expect(submoduleStatusColor('dirty')).toContain('orange')
    expect(submoduleStatusColor('ahead')).toContain('amber')
    expect(submoduleStatusColor('behind')).toContain('violet')
    expect(submoduleStatusColor('uninitialized')).toContain('subtle')
  })
})
