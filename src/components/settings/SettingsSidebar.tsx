import type { SettingsSection } from './settingsSections'
import { SETTINGS_SECTIONS } from './settingsSections'

interface SettingsSidebarProps {
  active: SettingsSection
  onSelect: (section: SettingsSection) => void
}

export function SettingsSidebar({ active, onSelect }: SettingsSidebarProps) {
  return (
    <nav className="w-40 shrink-0 border-r border-gf-border pr-2" aria-label="Settings sections">
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
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
