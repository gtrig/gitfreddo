import { FieldLabel, TextInput } from '@/components/ui/Modal'
import type { AppSettings } from '@/hooks/useAppSettings'
import { APP_THEMES, THEME_LABELS } from '@/lib/themes'

interface PanelProps {
  form: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

export function InterfaceSettingsPanel({ form, onChange }: PanelProps) {
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Theme</FieldLabel>
        <select
          value={form.theme}
          onChange={(e) => onChange({ theme: e.target.value as AppSettings['theme'] })}
          className="w-full rounded border border-gf-border-strong bg-gf-bg-deep px-2 py-1.5 text-sm text-gf-fg"
        >
          {APP_THEMES.map((theme) => (
            <option key={theme} value={theme}>
              {THEME_LABELS[theme]}
            </option>
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
