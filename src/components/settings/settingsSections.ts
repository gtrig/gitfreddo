export type SettingsSection = 'git' | 'interface' | 'ai' | 'integrations' | 'maintenance'

export const SETTINGS_SECTION_KEY = 'gitfreddo:settings-section'

export const SETTINGS_SECTIONS: { id: SettingsSection }[] = [
  { id: 'git' },
  { id: 'maintenance' },
  { id: 'interface' },
  { id: 'ai' },
  { id: 'integrations' }
]

export function loadSettingsSection(): SettingsSection {
  if (typeof localStorage === 'undefined') return 'git'
  const stored = localStorage.getItem(SETTINGS_SECTION_KEY)
  if (
    stored === 'interface' ||
    stored === 'ai' ||
    stored === 'git' ||
    stored === 'integrations' ||
    stored === 'maintenance'
  ) {
    return stored
  }
  return 'git'
}

export function saveSettingsSection(section: SettingsSection): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SETTINGS_SECTION_KEY, section)
}
