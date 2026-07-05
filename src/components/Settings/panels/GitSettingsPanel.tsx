import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ActionButton, FieldLabel, TextInput } from '@/components/Ui/Modal'
import { LoadingRow } from '@/components/Ui/Spinner'
import type { AppSettings } from '@/hooks/useAppSettings'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { RepoFilesPanel } from '@/components/Settings/panels/RepoFilesPanel'
import { RepoHooksPanel } from '@/components/Settings/panels/RepoHooksPanel'

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
  const { t } = useTranslation()
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
      showToast(t('settings.git.configSaved', { key }), 'success')
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
          <FieldLabel>{t('settings.git.binaryPath')}</FieldLabel>
          <div className="flex gap-2">
            <TextInput
              value={form.gitBinaryPath}
              onChange={(e) => onChange({ gitBinaryPath: e.target.value })}
            />
            <ActionButton onClick={onPickGit}>{t('common.browse')}</ActionButton>
          </div>
        </div>
        <div>
          <FieldLabel>{t('settings.git.defaultRemote')}</FieldLabel>
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
          {t('settings.git.pullRebase')}
        </label>
      </div>

      <div className="space-y-3 border-t border-gf-border pt-4">
        <h3 className="text-sm font-semibold text-gf-fg">{t('settings.git.submodules')}</h3>
        <div>
          <FieldLabel>{t('settings.git.submoduleRecursion')}</FieldLabel>
          <select
            value={form.submoduleRecursion}
            onChange={(e) =>
              onChange({
                submoduleRecursion: e.target.value as AppSettings['submoduleRecursion']
              })
            }
            className="w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5 text-sm text-gf-fg"
          >
            <option value="none">{t('settings.git.submoduleRecursionNone')}</option>
            <option value="on-demand">{t('settings.git.submoduleRecursionOnDemand')}</option>
            <option value="always">{t('settings.git.submoduleRecursionAlways')}</option>
          </select>
        </div>
        <div>
          <FieldLabel>{t('settings.git.pushSubmoduleRecursion')}</FieldLabel>
          <select
            value={form.pushSubmoduleRecursion}
            onChange={(e) =>
              onChange({
                pushSubmoduleRecursion: e.target.value as AppSettings['pushSubmoduleRecursion']
              })
            }
            className="w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5 text-sm text-gf-fg"
          >
            <option value="no">{t('settings.git.pushSubmoduleRecursionNo')}</option>
            <option value="check">{t('settings.git.pushSubmoduleRecursionCheck')}</option>
            <option value="on-demand">{t('settings.git.pushSubmoduleRecursionOnDemand')}</option>
          </select>
        </div>
      </div>

      {connected && (
        <div className="space-y-3 border-t border-gf-border pt-4">
          <h3 className="text-sm font-semibold text-gf-fg">{t('settings.git.repoConfig')}</h3>
          {configQuery.isLoading && <LoadingRow label={t('settings.git.loadingConfig')} />}
          {configQuery.error && (
            <p className="text-sm text-red-400">
              {configQuery.error instanceof Error ? configQuery.error.message : t('settings.git.configLoadFailed')}
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
                      {t('common.save')}
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 border-t border-gf-border pt-4">
        <h3 className="text-sm font-semibold text-gf-fg">{t('settings.git.repoFiles')}</h3>
        <RepoFilesPanel />
      </div>

      <div className="space-y-3 border-t border-gf-border pt-4">
        <h3 className="text-sm font-semibold text-gf-fg">{t('settings.git.repoHooks')}</h3>
        <RepoHooksPanel />
      </div>
    </div>
  )
}
