import { resolveStoredTheme } from '@shared/themes'

const THEME_STORAGE_KEY = 'gitfreddo:theme'

try {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  const theme = resolveStoredTheme(stored)
  if (theme) {
    document.documentElement.dataset.theme = theme
  }
} catch {
  // ignore storage failures
}
