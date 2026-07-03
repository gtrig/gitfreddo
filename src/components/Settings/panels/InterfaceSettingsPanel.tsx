import { FieldLabel, TextInput } from '@/components/Ui/Modal'
import type { AppSettings } from '@/hooks/useAppSettings'
import { THEME_MODE_LABELS, THEME_MODES, THEMES } from '@/lib/themes'
import { useTranslation } from 'react-i18next'

interface PanelProps {
  form: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

export function InterfaceSettingsPanel({ form, onChange }: PanelProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel htmlFor="locale-select">{t('settings.language.label')}</FieldLabel>
        <select
          id="locale-select"
          value={form.locale}
          onChange={(e) => onChange({ locale: e.target.value as AppSettings['locale'] })}
          className="w-full rounded border border-gf-border-strong bg-gf-bg-deep px-2 py-1.5 text-sm text-gf-fg"
        >
          <option value="en">{t('settings.language.en')}</option>
          <option value="el">{t('settings.language.el')}</option>
        </select>
      </div>
      <div>
        <FieldLabel>Theme</FieldLabel>
        <select
          value={form.theme}
          onChange={(e) => onChange({ theme: e.target.value as AppSettings['theme'] })}
          className="w-full rounded border border-gf-border-strong bg-gf-bg-deep px-2 py-1.5 text-sm text-gf-fg"
        >
          {THEME_MODES.map((mode) => (
            <optgroup key={mode} label={THEME_MODE_LABELS[mode]}>
              {THEMES.filter((theme) => theme.mode === mode).map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>Poll interval (ms, 0 = off)</FieldLabel>
        <TextInput
          type="number"
          value={String(form.pollIntervalMs)}
          onChange={(e) =>
            onChange({ pollIntervalMs: Number.parseInt(e.target.value, 10) || 0 })
          }
        />
      </div>
      <div>
        <FieldLabel>Commit graph max commits</FieldLabel>
        <TextInput
          type="number"
          value={String(form.logMaxCount)}
          onChange={(e) =>
            onChange({ logMaxCount: Number.parseInt(e.target.value, 10) || 500 })
          }
        />
      </div>
      <div>
        <FieldLabel>External editor command (optional)</FieldLabel>
        <TextInput
          value={form.editorCommand}
          onChange={(e) => onChange({ editorCommand: e.target.value })}
          placeholder="code --wait"
        />
      </div>
      <div>
        <FieldLabel>Default diff view</FieldLabel>
        <select
          value={form.diffViewMode}
          onChange={(e) =>
            onChange({ diffViewMode: e.target.value as AppSettings['diffViewMode'] })
          }
          className="w-full rounded border border-gf-border-strong bg-gf-bg-deep px-2 py-1.5 text-sm text-gf-fg"
        >
          <option value="unified">Unified</option>
          <option value="split">Side by side</option>
          <option value="word">Word diff</option>
        </select>
      </div>
    </div>
  )
}
