import { FieldLabel, TextArea, TextInput } from '@/components/Ui/Modal'
import type { AppSettings } from '@/hooks/useAppSettings'
import { useTranslation } from 'react-i18next'

interface PanelProps {
  form: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

function InstructionField({
  label,
  description,
  value,
  placeholder,
  onChange
}: {
  label: string
  description: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="resize-y text-xs leading-relaxed"
      />
      <p className="mt-1 text-[11px] text-gf-fg-subtle">{description}</p>
    </div>
  )
}

export function AiSettingsPanel({ form, onChange }: PanelProps) {
  const { t } = useTranslation()
  const isApi = form.aiProvider === 'api'

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-gf-fg-subtle">
        {t('settings.ai.intro')}
      </p>

      <div>
        <FieldLabel>{t('settings.ai.provider')}</FieldLabel>
        <div className="flex gap-2">
          {(['local', 'api'] as const).map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => onChange({ aiProvider: provider })}
              className={`rounded border px-3 py-2 text-xs capitalize ${
                form.aiProvider === provider
                  ? 'border-gf-accent bg-gf-accent/10 text-gf-fg'
                  : 'border-gf-border-strong text-gf-fg-muted hover:bg-gf-surface-hover'
              }`}
            >
              {provider === 'local' ? t('settings.ai.providerLocal') : t('settings.ai.providerApi')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>{t('settings.ai.baseUrl')}</FieldLabel>
        <TextInput
          value={form.aiBaseUrl}
          onChange={(e) => onChange({ aiBaseUrl: e.target.value })}
          placeholder={
            isApi ? 'https://api.openai.com' : 'http://localhost:1234'
          }
        />
        <p className="mt-1 text-[11px] text-gf-fg-subtle">
          {isApi ? t('settings.ai.baseUrlHintApi') : t('settings.ai.baseUrlHintLocal')}
        </p>
      </div>

      {isApi && (
        <div>
          <FieldLabel>{t('settings.ai.apiKey')}</FieldLabel>
          <TextInput
            type="password"
            value={form.aiApiKey}
            onChange={(e) => onChange({ aiApiKey: e.target.value })}
            placeholder={t('settings.ai.apiKeyPlaceholder')}
            autoComplete="off"
          />
          <p className="mt-1 text-[11px] text-gf-fg-subtle">
            {t('settings.ai.apiKeyHint')}
          </p>
        </div>
      )}

      <div>
        <FieldLabel>{t('settings.ai.model')}</FieldLabel>
        <TextInput
          value={form.aiModel}
          onChange={(e) => onChange({ aiModel: e.target.value })}
          placeholder={t('settings.ai.modelPlaceholder')}
        />
      </div>

      <div className="border-t border-gf-border pt-3">
        <p className="mb-3 text-xs font-medium text-gf-fg-muted">{t('settings.ai.customInstructions')}</p>
        <div className="space-y-3">
          <InstructionField
            label={t('settings.ai.systemInstructions')}
            description={t('settings.ai.systemInstructionsDesc')}
            value={form.aiSystemInstructions}
            placeholder={t('settings.ai.systemInstructionsPlaceholder')}
            onChange={(value) => onChange({ aiSystemInstructions: value })}
          />
          <InstructionField
            label={t('settings.ai.commitInstructions')}
            description={t('settings.ai.commitInstructionsDesc')}
            value={form.aiCommitInstructions}
            placeholder={t('settings.ai.commitInstructionsPlaceholder')}
            onChange={(value) => onChange({ aiCommitInstructions: value })}
          />
          <InstructionField
            label={t('settings.ai.stashInstructions')}
            description={t('settings.ai.stashInstructionsDesc')}
            value={form.aiStashInstructions}
            placeholder={t('settings.ai.stashInstructionsPlaceholder')}
            onChange={(value) => onChange({ aiStashInstructions: value })}
          />
          <InstructionField
            label={t('settings.ai.conflictInstructions')}
            description={t('settings.ai.conflictInstructionsDesc')}
            value={form.aiConflictInstructions}
            placeholder={t('settings.ai.conflictInstructionsPlaceholder')}
            onChange={(value) => onChange({ aiConflictInstructions: value })}
          />
        </div>
      </div>
    </div>
  )
}
