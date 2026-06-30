import { describe, expect, it } from 'vitest'
import { SETTINGS_SECTIONS, type SettingsSection } from '@/components/settings/settingsSections'

describe('settingsSections', () => {
  it('includes integrations section', () => {
    const ids = SETTINGS_SECTIONS.map((section) => section.id)
    expect(ids).toContain('integrations')
  })

  it('has unique section ids', () => {
    const ids = SETTINGS_SECTIONS.map((section) => section.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('types integrations as a valid SettingsSection', () => {
    const section: SettingsSection = 'integrations'
    expect(section).toBe('integrations')
  })
})
