import type { AppTheme } from '../../shared/themes'
import { APP_THEMES, isAppTheme, normalizeAppTheme, THEME_BG_COLORS, THEME_LABELS, THEME_MODE_LABELS, THEME_MODES, THEMES } from '../../shared/themes'

export type { AppTheme }
export { APP_THEMES, THEME_BG_COLORS, THEME_LABELS, THEME_MODE_LABELS, THEME_MODES, THEMES }

export const THEME_STORAGE_KEY = 'gitfreddo:theme'

export function normalizeTheme(value: unknown): AppTheme {
  return normalizeAppTheme(value)
}

export function applyTheme(theme: AppTheme): void {
  const normalized = normalizeTheme(theme)
  document.documentElement.dataset.theme = normalized
  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalized)
  } catch {
    // ignore storage failures
  }
}

export function readStoredTheme(): AppTheme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'fredo') {
      return 'freddo'
    }
    return isAppTheme(stored) ? stored : null
  } catch {
    return null
  }
}

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
