import { describe, expect, it } from 'vitest'
import { normalizeAppTheme } from './themes'

describe('normalizeAppTheme (ipc re-export)', () => {
  it('re-exports normalizeAppTheme from shared/themes', () => {
    expect(normalizeAppTheme('lavender')).toBe('lavender')
    expect(normalizeAppTheme('fredo')).toBe('freddo')
    expect(normalizeAppTheme('bogus')).toBe('dark')
  })
})
