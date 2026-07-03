export type ThemeMode = 'dark' | 'light'

export interface ThemeDefinition {
  readonly id: string
  readonly label: string
  readonly bgColor: string
  readonly mode: ThemeMode
}
