import { isAppTheme } from '../shared/themes'

const THEME_STORAGE_KEY = 'gitfreddo:theme'

try {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'fredo') {
    document.documentElement.dataset.theme = 'freddo'
  } else if (isAppTheme(stored)) {
    document.documentElement.dataset.theme = stored
  }
} catch {
  // ignore storage failures
}
