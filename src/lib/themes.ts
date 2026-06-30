import type { AppTheme } from '../../shared/ipc'
import { normalizeAppTheme } from '../../shared/ipc'

export type { AppTheme }

export const THEME_STORAGE_KEY = 'gitfredo:theme'

export const THEME_BG_COLORS: Record<AppTheme, string> = {
  dark: '#18181b',
  freddo: '#1c1612'
}

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
    return stored === 'freddo' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
