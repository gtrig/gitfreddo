import type { ThemeMode } from './types'
import { blossom } from './blossom'
import { cloud } from './cloud'
import { dark } from './dark'
import { dusk } from './dusk'
import { freddo } from './freddo'
import { lavender } from './lavender'
import { midnight } from './midnight'
import { mint } from './mint'
import { paper } from './paper'
import { sage } from './sage'
import { sand } from './sand'

export type { ThemeDefinition, ThemeMode } from './types'

export const THEMES = [
  dark,
  freddo,
  midnight,
  sage,
  lavender,
  dusk,
  paper,
  cloud,
  blossom,
  mint,
  sand
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

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === 'string' && (APP_THEMES as readonly string[]).includes(value)
}

export function normalizeAppTheme(value: unknown): AppTheme {
  if (value === 'fredo') {
    return 'freddo'
  }
  if (isAppTheme(value)) {
    return value
  }
  return 'dark'
}
