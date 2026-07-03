import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_DOC_PATH,
  DOC_PATH_KEY,
  DOC_SECTIONS,
  isKnownDocPath,
  loadDocPath,
  saveDocPath
} from './catalog'

function stubLocalStorage() {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    clear: () => {
      storage.clear()
    }
  })
  return storage
}

describe('DOC_SECTIONS', () => {
  it('includes the default readme path', () => {
    const paths = DOC_SECTIONS.flatMap((section) => section.pages.map((page) => page.path))
    expect(paths).toContain(DEFAULT_DOC_PATH)
  })
})

describe('isKnownDocPath', () => {
  it('accepts catalogued docs and rejects unknown paths', () => {
    expect(isKnownDocPath('README.md')).toBe(true)
    expect(isKnownDocPath('contributing/testing.md')).toBe(true)
    expect(isKnownDocPath('missing.md')).toBe(false)
  })
})

describe('doc path persistence', () => {
  beforeEach(() => {
    stubLocalStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the default path when nothing is stored', () => {
    expect(loadDocPath()).toBe(DEFAULT_DOC_PATH)
  })

  it('round-trips a known doc path through localStorage', () => {
    saveDocPath('workflows/06-worktrees.md')
    expect(loadDocPath()).toBe('workflows/06-worktrees.md')
  })

  it('ignores unknown stored paths', () => {
    localStorage.setItem(DOC_PATH_KEY, 'unknown.md')
    expect(loadDocPath()).toBe(DEFAULT_DOC_PATH)
  })
})
