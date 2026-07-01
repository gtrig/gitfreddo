export type SettingsSection = 'git' | 'interface' | 'ai' | 'integrations' | 'maintenance'

export const SETTINGS_SECTION_KEY = 'gitfredo:settings-section'

export const SETTINGS_SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'git', label: 'Git' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'interface', label: 'Interface' },
  { id: 'ai', label: 'AI assist' },
  { id: 'integrations', label: 'Integrations' }
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
