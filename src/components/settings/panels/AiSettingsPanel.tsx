import { FieldLabel, TextArea, TextInput } from '@/components/ui/Modal'
import type { AppSettings } from '@/hooks/useAppSettings'

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
  const isApi = form.aiProvider === 'api'

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-gf-fg-subtle">
        AI assist fills commit and stash messages from your staged or working-tree changes.
        Supports OpenAI-compatible endpoints (LM Studio, Ollama, OpenAI, OpenRouter).
      </p>

      <div>
        <FieldLabel>Provider</FieldLabel>
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
              {provider === 'local' ? 'Local LLM' : 'Cloud API'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Base URL</FieldLabel>
        <TextInput
          value={form.aiBaseUrl}
          onChange={(e) => onChange({ aiBaseUrl: e.target.value })}
          placeholder={
            isApi ? 'https://api.openai.com' : 'http://localhost:1234'
          }
        />
        <p className="mt-1 text-[11px] text-gf-fg-subtle">
          {isApi
            ? 'OpenAI-compatible API base URL (/v1 is appended automatically).'
            : 'LM Studio: http://localhost:1234 · Ollama: http://localhost:11434'}
        </p>
      </div>

      {isApi && (
        <div>
          <FieldLabel>API key</FieldLabel>
          <TextInput
            type="password"
            value={form.aiApiKey}
            onChange={(e) => onChange({ aiApiKey: e.target.value })}
            placeholder="sk-…"
            autoComplete="off"
          />
          <p className="mt-1 text-[11px] text-gf-fg-subtle">
            Stored in ~/.config/gitfreddo/settings.json on this machine.
          </p>
        </div>
      )}

      <div>
        <FieldLabel>Model (optional)</FieldLabel>
        <TextInput
          value={form.aiModel}
          onChange={(e) => onChange({ aiModel: e.target.value })}
          placeholder="Leave empty to auto-select first available model"
        />
      </div>

      <div className="border-t border-gf-border pt-3">
        <p className="mb-3 text-xs font-medium text-gf-fg-muted">Custom instructions</p>
        <div className="space-y-3">
          <InstructionField
            label="System instructions"
            description="Appended to the system prompt for every AI assist request."
            value={form.aiSystemInstructions}
            placeholder="e.g. Use British English. Prefer conventional commit prefixes."
            onChange={(value) => onChange({ aiSystemInstructions: value })}
          />
          <InstructionField
            label="Commit message instructions"
            description="Added when generating commit messages from staged changes."
            value={form.aiCommitInstructions}
            placeholder="e.g. Reference ticket IDs. Keep the subject under 50 characters."
            onChange={(value) => onChange({ aiCommitInstructions: value })}
          />
          <InstructionField
            label="Stash message instructions"
            description="Added when generating stash messages from working-tree changes."
            value={form.aiStashInstructions}
            placeholder="e.g. Prefix messages with WIP: and mention the feature area."
            onChange={(value) => onChange({ aiStashInstructions: value })}
          />
        </div>
      </div>
    </div>
  )
}
