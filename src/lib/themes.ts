import type { AppTheme } from '@shared/themes'
import {
  APP_THEMES,
  normalizeAppTheme,
  resolveStoredTheme,
  THEME_BG_COLORS,
  THEME_LABELS,
  THEME_MODE_LABELS,
  THEME_MODES,
  THEMES
} from '@shared/themes'

export type { AppTheme }
export {
  APP_THEMES,
  resolveStoredTheme,
  THEME_BG_COLORS,
  THEME_LABELS,
  THEME_MODE_LABELS,
  THEME_MODES,
  THEMES
}

export const THEME_STORAGE_KEY = 'gitfreddo:theme'

export function normalizeTheme(value: unknown): AppTheme {
  return normalizeAppTheme(value)
}

export function setDocumentTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = normalizeTheme(theme)
}

export function applyTheme(theme: AppTheme): void {
  const normalized = normalizeTheme(theme)
  setDocumentTheme(normalized)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalized)
  } catch {
    // ignore storage failures
  }
}

export function readStoredTheme(): AppTheme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return resolveStoredTheme(stored)
  } catch {
    return null
  }
}

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
