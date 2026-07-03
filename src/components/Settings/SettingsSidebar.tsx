import { useTranslation } from 'react-i18next'
import type { SettingsSection } from './settingsSections'
import { SETTINGS_SECTIONS } from './settingsSections'

interface SettingsSidebarProps {
  active: SettingsSection
  onSelect: (section: SettingsSection) => void
}

export function SettingsSidebar({ active, onSelect }: SettingsSidebarProps) {
  const { t } = useTranslation()

  return (
    <nav className="w-40 shrink-0 border-r border-gf-border pr-2" aria-label={t('settings.sectionsAria')}>
      <ul className="space-y-0.5">
        {SETTINGS_SECTIONS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active === item.id ? 'page' : undefined}
              className={`w-full rounded px-3 py-2 text-left text-sm transition ${
                active === item.id
                  ? 'bg-gf-surface text-gf-fg'
                  : 'text-gf-fg-subtle hover:bg-gf-bg hover:text-gf-fg-muted'
              }`}
            >
              {t(`settings.sections.${item.id}`)}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
