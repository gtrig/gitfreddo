import type { ThemeDefinition } from './types'

export const black = {
  id: 'black',
  label: 'Black',
  bgColor: '#18181b',
  mode: 'dark'
} as const satisfies ThemeDefinition
