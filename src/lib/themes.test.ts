import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeAppTheme } from '@shared/themes'
import { applyTheme, normalizeTheme, readStoredTheme, THEME_STORAGE_KEY } from '@/lib/themes'

describe('normalizeTheme', () => {
  it('accepts all app themes', () => {
    expect(normalizeTheme('black')).toBe('black')
    expect(normalizeTheme('freddo')).toBe('freddo')
    expect(normalizeTheme('americano')).toBe('americano')
    expect(normalizeTheme('matcha')).toBe('matcha')
    expect(normalizeTheme('mocha')).toBe('mocha')
    expect(normalizeTheme('caramel')).toBe('caramel')
    expect(normalizeTheme('iced-latte')).toBe('iced-latte')
    expect(normalizeTheme('iced-americano')).toBe('iced-americano')
    expect(normalizeTheme('fredo')).toBe('freddo')
    expect(normalizeTheme('dark')).toBe('black')
    expect(normalizeTheme('paper')).toBe('iced-latte')
    expect(normalizeTheme('light')).toBe('black')
    expect(normalizeTheme(undefined)).toBe('black')
    expect(normalizeAppTheme('invalid')).toBe('black')
  })
})

describe('applyTheme', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('document', {
      documentElement: {
        dataset: {} as DOMStringMap,
        removeAttribute: vi.fn(function (this: { dataset: DOMStringMap }, name: string) {
          delete this.dataset[name]
        })
      }
    })
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets data-theme on the document root', () => {
    applyTheme('freddo')
    expect(document.documentElement.dataset.theme).toBe('freddo')
  })

  it('mirrors the theme to localStorage', () => {
    applyTheme('black')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('black')
    expect(readStoredTheme()).toBe('black')
  })

  it('normalizes legacy fredo in localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'fredo')
    expect(readStoredTheme()).toBe('freddo')
  })

  it('reads legacy themes from localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'midnight')
    expect(readStoredTheme()).toBe('americano')
  })

  it('normalizes invalid themes to black', () => {
    applyTheme('freddo')
    applyTheme('bogus' as 'black')
    expect(document.documentElement.dataset.theme).toBe('black')
  })
})
