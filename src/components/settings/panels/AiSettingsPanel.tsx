import { FieldLabel, TextInput } from '@/components/ui/Modal'
import type { AppSettings } from '@/hooks/useAppSettings'

interface PanelProps {
  form: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

export function AiSettingsPanel({ form, onChange }: PanelProps) {
  const isApi = form.aiProvider === 'api'

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-zinc-500">
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
                  ? 'border-sky-600 bg-sky-950/40 text-sky-200'
                  : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
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
        <p className="mt-1 text-[11px] text-zinc-600">
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
          <p className="mt-1 text-[11px] text-zinc-600">
            Stored in ~/.config/gitfredo/settings.json on this machine.
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
    </div>
  )
}
