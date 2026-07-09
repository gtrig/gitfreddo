import { describe, expect, it } from 'vitest'
import { normalizeAppTheme } from './themes'

describe('normalizeAppTheme (ipc re-export)', () => {
  it('re-exports normalizeAppTheme from shared/themes', () => {
    expect(normalizeAppTheme('mocha')).toBe('mocha')
    expect(normalizeAppTheme('fredo')).toBe('freddo')
    expect(normalizeAppTheme('paper')).toBe('iced-latte')
    expect(normalizeAppTheme('bogus')).toBe('black')
  })
})
