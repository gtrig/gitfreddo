import type { ThemeDefinition } from './types'

export const dark = {
  id: 'dark',
  label: 'Dark',
  bgColor: '#18181b',
  mode: 'dark'
} as const satisfies ThemeDefinition
