import { describe, expect, it } from 'vitest'
import { APP_THEMES, isAppTheme, normalizeAppTheme, THEME_BG_COLORS, THEME_LABELS, THEMES } from './index'

describe('normalizeAppTheme', () => {
  it('accepts all known themes', () => {
    for (const theme of APP_THEMES) {
      expect(normalizeAppTheme(theme)).toBe(theme)
    }
  })

  it('maps legacy fredo to freddo', () => {
    expect(normalizeAppTheme('fredo')).toBe('freddo')
  })

  it('falls back to dark for unknown values', () => {
    expect(normalizeAppTheme('light')).toBe('dark')
    expect(normalizeAppTheme(null)).toBe('dark')
    expect(normalizeAppTheme(undefined)).toBe('dark')
    expect(normalizeAppTheme('invalid')).toBe('dark')
  })
})

describe('isAppTheme', () => {
  it('recognizes valid theme ids', () => {
    expect(isAppTheme('midnight')).toBe(true)
    expect(isAppTheme('sage')).toBe(true)
    expect(isAppTheme('paper')).toBe(true)
    expect(isAppTheme('cloud')).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isAppTheme('fredo')).toBe(false)
    expect(isAppTheme('light')).toBe(false)
  })
})

describe('theme metadata', () => {
  it('defines labels and background colors for every theme', () => {
    for (const theme of APP_THEMES) {
      expect(THEME_LABELS[theme]).toBeTruthy()
      expect(THEME_BG_COLORS[theme]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('assigns every theme to dark or light mode', () => {
    for (const theme of THEMES) {
      expect(theme.mode === 'dark' || theme.mode === 'light').toBe(true)
    }
  })
})
