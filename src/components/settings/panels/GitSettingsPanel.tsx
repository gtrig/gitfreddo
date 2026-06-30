import { ActionButton, FieldLabel, TextInput } from '@/components/ui/Modal'
import type { AppSettings } from '@/hooks/useAppSettings'

interface PanelProps {
  form: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
  onPickGit: () => void
}

export function GitSettingsPanel({ form, onChange, onPickGit }: PanelProps) {
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>git binary path</FieldLabel>
        <div className="flex gap-2">
          <TextInput
            value={form.gitBinaryPath}
            onChange={(e) => onChange({ gitBinaryPath: e.target.value })}
          />
          <ActionButton onClick={onPickGit}>Browse</ActionButton>
        </div>
      </div>
      <div>
        <FieldLabel>Default remote</FieldLabel>
        <TextInput
          value={form.defaultRemote}
          onChange={(e) => onChange({ defaultRemote: e.target.value })}
        />
      </div>
    </div>
  )
}
