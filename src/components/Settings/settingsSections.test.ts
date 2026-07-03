import { describe, expect, it } from 'vitest'
import { SETTINGS_SECTIONS, type SettingsSection } from '@/components/Settings/settingsSections'

describe('settingsSections', () => {
  it('includes integrations and maintenance sections', () => {
    const ids = SETTINGS_SECTIONS.map((section) => section.id)
    expect(ids).toContain('integrations')
    expect(ids).toContain('maintenance')
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
