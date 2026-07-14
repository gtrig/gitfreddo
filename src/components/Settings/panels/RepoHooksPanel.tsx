import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ActionButton, FieldLabel } from '@/components/Ui/Modal'
import { CodeEditor } from '@/components/Ui/CodeEditor'
import { LoadingRow } from '@/components/Ui/Spinner'
import type { GitHook, GitHooksListResult } from '@/lib/types'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'

export function RepoHooksPanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const showToast = useToastStore((s) => s.show)
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [configuringHooksPath, setConfiguringHooksPath] = useState(false)

  const listQuery = useQuery({
    queryKey: ['repo', repoPath, 'hooks.list'],
    queryFn: async () =>
      (await window.gitfreddo.invoke('hooks.list')) as GitHooksListResult,
    enabled: connected && Boolean(repoPath)
  })

  const hooks = listQuery.data?.hooks ?? []

  useEffect(() => {
    if (hooks.length === 0) {
      setSelected(null)
      return
    }
    if (!selected || !hooks.some((hook) => hook.name === selected)) {
      setSelected(hooks[0]?.name ?? null)
    }
  }, [hooks, selected])

  const readQuery = useQuery({
    queryKey: ['repo', repoPath, 'hooks.read', selected],
    queryFn: async () =>
      (await window.gitfreddo.invoke('hooks.read', { name: selected })) as string,
    enabled: connected && Boolean(repoPath) && Boolean(selected)
  })

  useEffect(() => {
    if (readQuery.data !== undefined) {
      setDraft(readQuery.data)
    }
  }, [readQuery.data, selected])

  const selectedHook = hooks.find((hook) => hook.name === selected)

  async function invalidateHooks() {
    if (!repoPath) return
    await queryClient.invalidateQueries({ queryKey: ['repo', repoPath, 'hooks.list'] })
    if (selected) {
      await queryClient.invalidateQueries({ queryKey: ['repo', repoPath, 'hooks.read', selected] })
    }
  }

  if (!connected) {
    return <p className="text-sm text-gf-fg-subtle">{t('settings.repoHooks.connectRequired')}</p>
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      await window.gitfreddo.invoke('hooks.write', { name: selected, content: draft })
      showToast(t('settings.repoHooks.saved', { name: selected }), 'success')
      await invalidateHooks()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleEnable() {
    if (!selected) return
    setToggling(true)
    try {
      await window.gitfreddo.invoke('hooks.enable', { name: selected })
      showToast(t('settings.repoHooks.enabledToast', { name: selected }), 'success')
      await invalidateHooks()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setToggling(false)
    }
  }

  async function handleDisable() {
    if (!selected) return
    setToggling(true)
    try {
      await window.gitfreddo.invoke('hooks.disable', { name: selected })
      showToast(t('settings.repoHooks.disabledToast', { name: selected }), 'success')
      await invalidateHooks()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setToggling(false)
    }
  }

  async function handleUseAlternateHooksPath() {
    const hooksPath = listQuery.data?.alternateHooksPath
    if (!hooksPath) return
    setConfiguringHooksPath(true)
    try {
      await window.gitfreddo.invoke('config.set', {
        key: 'core.hooksPath',
        value: hooksPath,
        scope: 'local'
      })
      showToast(t('settings.repoHooks.alternateHooksPathEnabled', { path: hooksPath }), 'success')
      await invalidateHooks()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setConfiguringHooksPath(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    if (!window.confirm(t('settings.repoHooks.deleteConfirm', { name: selected }))) return
    setDeleting(true)
    try {
      await window.gitfreddo.invoke('hooks.delete', { name: selected })
      showToast(t('settings.repoHooks.deleted', { name: selected }), 'success')
      setSelected(null)
      await invalidateHooks()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const dirty = readQuery.data !== undefined && draft !== readQuery.data

  function hookBadge(hook: GitHook) {
    if (hook.enabled) return t('settings.repoHooks.enabled')
    if (hook.filename.endsWith('.sample')) return t('settings.repoHooks.sample')
    return t('settings.repoHooks.disabled')
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gf-fg-muted">{t('settings.repoHooks.description')}</p>
      {listQuery.data?.hooksDir && (
        <p className="text-xs text-gf-fg-subtle">
          {t('settings.repoHooks.hooksPath', { path: listQuery.data.hooksDir })}
        </p>
      )}
      {listQuery.data?.alternateHooksDir && listQuery.data.alternateHooksPath && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-gf-fg-muted">
          <p>
            {t('settings.repoHooks.alternateHooksPath', {
              path: listQuery.data.alternateHooksDir,
              activePath: listQuery.data.hooksDir
            })}
          </p>
          <div className="mt-2">
            <ActionButton
              loading={configuringHooksPath}
              onClick={() => void handleUseAlternateHooksPath()}
            >
              {t('settings.repoHooks.useAlternateHooksPath', {
                path: listQuery.data.alternateHooksPath
              })}
            </ActionButton>
          </div>
        </div>
      )}
      {listQuery.isLoading && <LoadingRow label={t('settings.repoHooks.loading')} />}
      {listQuery.error && (
        <p className="text-sm text-red-400">
          {listQuery.error instanceof Error ? listQuery.error.message : t('settings.repoHooks.loadFailed')}
        </p>
      )}
      {listQuery.data && hooks.length === 0 && (
        <p className="text-sm text-gf-fg-subtle">{t('settings.repoHooks.empty')}</p>
      )}
      {hooks.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {hooks.map((hook) => (
              <button
                key={hook.name}
                type="button"
                onClick={() => setSelected(hook.name)}
                className={`rounded border px-3 py-1 text-xs ${
                  selected === hook.name
                    ? 'border-gf-accent bg-gf-surface text-gf-fg'
                    : 'border-gf-border-strong text-gf-fg-muted hover:bg-gf-surface-hover'
                }`}
              >
                {hook.name}
                <span className="ml-1.5 opacity-70">({hookBadge(hook)})</span>
              </button>
            ))}
          </div>
          {selected && readQuery.isLoading && (
            <LoadingRow label={t('settings.repoHooks.loadingHook', { name: selected })} />
          )}
          {readQuery.error && (
            <p className="text-sm text-red-400">
              {readQuery.error instanceof Error
                ? readQuery.error.message
                : t('settings.repoHooks.loadFailed')}
            </p>
          )}
          {readQuery.data !== undefined && selected && (
            <>
              <div>
                <FieldLabel>{selected}</FieldLabel>
                <CodeEditor
                  rows={14}
                  language="shell"
                  value={draft}
                  onChange={setDraft}
                  className="font-mono text-xs"
                  aria-label={selected}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <ActionButton
                  loading={toggling}
                  disabled={selectedHook?.enabled === true}
                  onClick={() => void handleEnable()}
                >
                  {t('settings.repoHooks.enable')}
                </ActionButton>
                <ActionButton
                  loading={toggling}
                  disabled={selectedHook?.enabled !== true}
                  onClick={() => void handleDisable()}
                >
                  {t('settings.repoHooks.disable')}
                </ActionButton>
                <ActionButton loading={deleting} onClick={() => void handleDelete()}>
                  {t('settings.repoHooks.delete')}
                </ActionButton>
                <ActionButton
                  variant="primary"
                  loading={saving}
                  disabled={!dirty}
                  onClick={() => void handleSave()}
                >
                  {t('settings.repoHooks.save', { name: selected })}
                </ActionButton>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
