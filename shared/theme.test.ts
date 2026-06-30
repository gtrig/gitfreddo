import { describe, expect, it } from 'vitest'
import { normalizeAppTheme } from '../shared/ipc'

describe('normalizeAppTheme', () => {
  it('returns freddo only for the freddo value', () => {
    expect(normalizeAppTheme('freddo')).toBe('freddo')
  })

  it('maps legacy fredo to freddo', () => {
    expect(normalizeAppTheme('fredo')).toBe('freddo')
  })

  it('falls back to dark for unknown values', () => {
    expect(normalizeAppTheme('dark')).toBe('dark')
    expect(normalizeAppTheme('light')).toBe('dark')
    expect(normalizeAppTheme(null)).toBe('dark')
    expect(normalizeAppTheme(undefined)).toBe('dark')
  })
})
