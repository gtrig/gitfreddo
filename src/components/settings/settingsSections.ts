export type SettingsSection = 'git' | 'interface' | 'ai'

export const SETTINGS_SECTION_KEY = 'gitfredo:settings-section'

export const SETTINGS_SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'git', label: 'Git' },
  { id: 'interface', label: 'Interface' },
  { id: 'ai', label: 'AI assist' }
]

export function loadSettingsSection(): SettingsSection {
  if (typeof localStorage === 'undefined') return 'git'
  const stored = localStorage.getItem(SETTINGS_SECTION_KEY)
  if (stored === 'interface' || stored === 'ai' || stored === 'git') {
    return stored
  }
  return 'git'
}

export function saveSettingsSection(section: SettingsSection): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SETTINGS_SECTION_KEY, section)
}
