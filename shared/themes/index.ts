import type { ThemeMode } from './types'
import { americano } from './americano'
import { black } from './black'
import { caramel } from './caramel'
import { freddo } from './freddo'
import { icedAmericano } from './iced-americano'
import { icedCaramel } from './iced-caramel'
import { icedLatte } from './iced-latte'
import { icedMatcha } from './iced-matcha'
import { icedVanilla } from './iced-vanilla'
import { matcha } from './matcha'
import { mocha } from './mocha'

export type { ThemeDefinition, ThemeMode } from './types'

export const THEMES = [
  black,
  freddo,
  americano,
  matcha,
  mocha,
  caramel,
  icedLatte,
  icedAmericano,
  icedVanilla,
  icedMatcha,
  icedCaramel
] as const

export type AppTheme = (typeof THEMES)[number]['id']

export const THEME_MODES = ['dark', 'light'] as const satisfies readonly ThemeMode[]

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  dark: 'Dark',
  light: 'Light'
}

export const APP_THEMES: AppTheme[] = THEMES.map((theme) => theme.id)

export const THEME_LABELS = Object.fromEntries(THEMES.map((theme) => [theme.id, theme.label])) as Record<
  AppTheme,
  string
>

export const THEME_BG_COLORS = Object.fromEntries(THEMES.map((theme) => [theme.id, theme.bgColor])) as Record<
  AppTheme,
  string
>

const LEGACY_THEME_IDS = {
  dark: 'black',
  midnight: 'americano',
  sage: 'matcha',
  lavender: 'mocha',
  dusk: 'caramel',
  paper: 'iced-latte',
  cloud: 'iced-americano',
  blossom: 'iced-vanilla',
  mint: 'iced-matcha',
  sand: 'iced-caramel'
} as const satisfies Record<string, AppTheme>

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === 'string' && (APP_THEMES as readonly string[]).includes(value)
}

export function resolveStoredTheme(value: string | null | undefined): AppTheme | null {
  if (value == null) {
    return null
  }
  if (value === 'fredo') {
    return 'freddo'
  }
  const legacy = LEGACY_THEME_IDS[value as keyof typeof LEGACY_THEME_IDS]
  if (legacy) {
    return legacy
  }
  return isAppTheme(value) ? value : null
}

export function normalizeAppTheme(value: unknown): AppTheme {
  if (typeof value !== 'string') {
    return 'black'
  }
  return resolveStoredTheme(value) ?? 'black'
}
