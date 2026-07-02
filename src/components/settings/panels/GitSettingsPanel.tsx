import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ActionButton, FieldLabel, TextInput } from '@/components/ui/Modal'
import { LoadingRow } from '@/components/ui/Spinner'
import type { AppSettings } from '@/hooks/useAppSettings'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { RepoFilesPanel } from '@/components/settings/panels/RepoFilesPanel'

interface PanelProps {
  form: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
  onPickGit: () => void
}

const REPO_CONFIG_KEYS = [
  'user.name',
  'user.email',
  'commit.gpgsign',
  'pull.rebase',
  'init.defaultBranch'
] as const

export function GitSettingsPanel({ form, onChange, onPickGit }: PanelProps) {
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const showToast = useToastStore((s) => s.show)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const configQuery = useQuery({
    queryKey: ['repo', repoPath, 'config.list', 'local'],
    queryFn: async () =>
      (await window.gitfreddo.invoke('config.list', { scope: 'local' })) as Record<string, string>,
    enabled: connected && Boolean(repoPath)
  })

  useEffect(() => {
    if (configQuery.data) {
      setDraft(configQuery.data)
    }
  }, [configQuery.data])

  async function saveKey(key: string) {
    setSavingKey(key)
    try {
      await window.gitfreddo.invoke('config.set', {
        key,
        value: draft[key] ?? '',
        scope: 'local'
      })
      showToast(`Saved ${key}.`, 'success')
      await configQuery.refetch()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="space-y-6">
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
        <label className="flex items-center gap-2 text-sm text-gf-fg-muted">
          <input
            type="checkbox"
            checked={form.pullRebase}
            onChange={(e) => onChange({ pullRebase: e.target.checked })}
            className="rounded border-gf-border-strong"
          />
          Pull with rebase
        </label>
      </div>

      {connected && (
        <div className="space-y-3 border-t border-gf-border pt-4">
          <h3 className="text-sm font-semibold text-gf-fg">Repository config (local)</h3>
          {configQuery.isLoading && <LoadingRow label="Loading repo config…" />}
          {configQuery.error && (
            <p className="text-sm text-red-400">
              {configQuery.error instanceof Error ? configQuery.error.message : 'Failed to load config.'}
            </p>
          )}
          {configQuery.data && (
            <div className="space-y-3">
              {REPO_CONFIG_KEYS.map((key) => (
                <div key={key}>
                  <FieldLabel>{key}</FieldLabel>
                  <div className="flex gap-2">
                    <TextInput
                      value={draft[key] ?? ''}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, [key]: event.target.value }))
                      }
                      placeholder={configQuery.data[key] ?? ''}
                    />
                    <ActionButton
                      loading={savingKey === key}
                      disabled={(draft[key] ?? '') === (configQuery.data[key] ?? '')}
                      onClick={() => void saveKey(key)}
                    >
                      Save
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 border-t border-gf-border pt-4">
        <h3 className="text-sm font-semibold text-gf-fg">Repository files</h3>
        <RepoFilesPanel />
      </div>
    </div>
  )
}
