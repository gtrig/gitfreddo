import { FieldLabel, TextInput } from '@/components/ui/Modal'
import type { AppSettings } from '@/hooks/useAppSettings'

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
          <option value="dark">Dark</option>
          <option value="freddo">Freddo</option>
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
    </div>
  )
}
