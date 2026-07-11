export type SettingsSection =
  | 'git'
  | 'workspace'
  | 'interface'
  | 'ai'
  | 'integrations'
  | 'maintenance'

export const SETTINGS_SECTION_KEY = 'gitfreddo:settings-section'

export const SETTINGS_SECTIONS: { id: SettingsSection }[] = [
  { id: 'interface' },
  { id: 'ai' },
  { id: 'git' },
  { id: 'workspace' },
  { id: 'integrations' },
  { id: 'maintenance' }
]

const VALID_SECTIONS = new Set<SettingsSection>(SETTINGS_SECTIONS.map((section) => section.id))

export function loadSettingsSection(): SettingsSection {
  if (typeof localStorage === 'undefined') return 'git'
  const stored = localStorage.getItem(SETTINGS_SECTION_KEY)
  if (stored && VALID_SECTIONS.has(stored as SettingsSection)) {
    return stored as SettingsSection
  }
  return 'git'
}

export function saveSettingsSection(section: SettingsSection): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SETTINGS_SECTION_KEY, section)
}
