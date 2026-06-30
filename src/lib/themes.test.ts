import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeAppTheme } from '../../shared/ipc'
import { applyTheme, normalizeTheme, readStoredTheme, THEME_STORAGE_KEY } from './themes'

describe('normalizeTheme', () => {
  it('accepts dark and freddo only', () => {
    expect(normalizeTheme('dark')).toBe('dark')
    expect(normalizeTheme('freddo')).toBe('freddo')
    expect(normalizeTheme('fredo')).toBe('freddo')
    expect(normalizeTheme('light')).toBe('dark')
    expect(normalizeTheme(undefined)).toBe('dark')
    expect(normalizeAppTheme('invalid')).toBe('dark')
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
    applyTheme('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('normalizes legacy fredo in localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'fredo')
    expect(readStoredTheme()).toBe('freddo')
  })

  it('normalizes invalid themes to dark', () => {
    applyTheme('freddo')
    applyTheme('bogus' as 'dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
