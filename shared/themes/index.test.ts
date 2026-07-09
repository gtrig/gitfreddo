import { describe, expect, it } from 'vitest'
import { APP_THEMES, isAppTheme, normalizeAppTheme, resolveStoredTheme, THEME_BG_COLORS, THEME_LABELS, THEMES } from './index'

describe('normalizeAppTheme', () => {
  it('accepts all known themes', () => {
    for (const theme of APP_THEMES) {
      expect(normalizeAppTheme(theme)).toBe(theme)
    }
  })

  it('maps legacy theme ids to coffee names', () => {
    expect(normalizeAppTheme('dark')).toBe('black')
    expect(normalizeAppTheme('midnight')).toBe('americano')
    expect(normalizeAppTheme('sage')).toBe('matcha')
    expect(normalizeAppTheme('lavender')).toBe('mocha')
    expect(normalizeAppTheme('dusk')).toBe('caramel')
    expect(normalizeAppTheme('paper')).toBe('iced-latte')
    expect(normalizeAppTheme('cloud')).toBe('iced-americano')
    expect(normalizeAppTheme('blossom')).toBe('iced-vanilla')
    expect(normalizeAppTheme('mint')).toBe('iced-matcha')
    expect(normalizeAppTheme('sand')).toBe('iced-caramel')
  })

  it('maps legacy fredo to freddo', () => {
    expect(normalizeAppTheme('fredo')).toBe('freddo')
  })

  it('falls back to black for unknown values', () => {
    expect(normalizeAppTheme('light')).toBe('black')
    expect(normalizeAppTheme(null)).toBe('black')
    expect(normalizeAppTheme(undefined)).toBe('black')
    expect(normalizeAppTheme('invalid')).toBe('black')
  })
})

describe('resolveStoredTheme', () => {
  it('returns null for unknown values', () => {
    expect(resolveStoredTheme(null)).toBeNull()
    expect(resolveStoredTheme('invalid')).toBeNull()
    expect(resolveStoredTheme('light')).toBeNull()
  })

  it('resolves legacy ids without falling back', () => {
    expect(resolveStoredTheme('paper')).toBe('iced-latte')
    expect(resolveStoredTheme('dark')).toBe('black')
  })
})

describe('isAppTheme', () => {
  it('recognizes valid theme ids', () => {
    expect(isAppTheme('black')).toBe(true)
    expect(isAppTheme('americano')).toBe(true)
    expect(isAppTheme('iced-latte')).toBe(true)
    expect(isAppTheme('iced-caramel')).toBe(true)
  })

  it('rejects legacy and unknown values', () => {
    expect(isAppTheme('fredo')).toBe(false)
    expect(isAppTheme('dark')).toBe(false)
    expect(isAppTheme('paper')).toBe(false)
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

  it('uses coffee drink names with Iced prefix for light themes', () => {
    for (const theme of THEMES) {
      expect(theme.mode === 'dark' || theme.mode === 'light').toBe(true)
      if (theme.mode === 'light') {
        expect(theme.label.startsWith('Iced ')).toBe(true)
      } else {
        expect(theme.label.startsWith('Iced ')).toBe(false)
      }
    }
  })
})
