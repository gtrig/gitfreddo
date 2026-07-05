import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { WorkingReadResult } from '@shared/working'
import { ActionButton, FieldLabel, TextArea } from '@/components/Ui/Modal'
import { LoadingRow } from '@/components/Ui/Spinner'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'

const REPO_FILES = [
  { path: '.gitignore', label: '.gitignore' },
  { path: '.gitattributes', label: '.gitattributes' },
  { path: '.gitmodules', label: '.gitmodules' }
] as const

export function RepoFilesPanel() {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const showToast = useToastStore((s) => s.show)
  const [selected, setSelected] = useState<(typeof REPO_FILES)[number]['path']>('.gitignore')
  const [draft, setDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  const fileQuery = useQuery({
    queryKey: ['repo', repoPath, 'working.read', selected],
    queryFn: async () =>
      (await window.gitfreddo.invoke('working.read', { path: selected })) as WorkingReadResult,
    enabled: connected && Boolean(repoPath)
  })

  useEffect(() => {
    if (fileQuery.data !== undefined) {
      setDraft(fileQuery.data.content)
      setCreating(false)
    }
  }, [fileQuery.data, selected])

  if (!connected) {
    return <p className="text-sm text-gf-fg-subtle">{t('settings.repoFiles.connectRequired')}</p>
  }

  async function handleSave() {
    setSaving(true)
    try {
      await window.gitfreddo.invoke('working.write', { path: selected, content: draft })
      showToast(t('settings.repoFiles.saved', { file: selected }), 'success')
      await fileQuery.refetch()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  const fileExists = fileQuery.data?.exists ?? false
  const showEditor = fileExists || creating
  const dirty = showEditor && (!fileExists || draft !== fileQuery.data?.content)

  return (
    <div className="space-y-3">
      <p className="text-sm text-gf-fg-muted">
        {t('settings.repoFiles.description')}
      </p>
      <div className="flex flex-wrap gap-2">
        {REPO_FILES.map((file) => (
          <button
            key={file.path}
            type="button"
            onClick={() => setSelected(file.path)}
            className={`rounded border px-3 py-1 text-xs ${
              selected === file.path
                ? 'border-gf-accent bg-gf-surface text-gf-fg'
                : 'border-gf-border-strong text-gf-fg-muted hover:bg-gf-surface-hover'
            }`}
          >
            {file.label}
          </button>
        ))}
      </div>
      {fileQuery.isLoading && <LoadingRow label={t('settings.repoFiles.loading', { file: selected })} />}
      {fileQuery.error && (
        <p className="text-sm text-red-400">
          {fileQuery.error instanceof Error ? fileQuery.error.message : t('settings.repoFiles.loadFailed')}
        </p>
      )}
      {fileQuery.data && !fileExists && !creating && (
        <div className="rounded border border-gf-border-strong bg-gf-surface px-4 py-3">
          <p className="text-sm text-gf-fg-muted">
            {t('settings.repoFiles.missing', { file: selected })}
          </p>
          <div className="mt-3">
            <ActionButton variant="primary" onClick={() => setCreating(true)}>
              {t('settings.repoFiles.create', { file: selected })}
            </ActionButton>
          </div>
        </div>
      )}
      {showEditor && fileQuery.data !== undefined && (
        <>
          <div>
            <FieldLabel>{selected}</FieldLabel>
            <TextArea
              rows={14}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex justify-end">
            <ActionButton
              variant="primary"
              loading={saving}
              disabled={!dirty}
              onClick={() => void handleSave()}
            >
              {fileExists
                ? t('settings.repoFiles.save', { file: selected })
                : t('settings.repoFiles.create', { file: selected })}
            </ActionButton>
          </div>
        </>
      )}
    </div>
  )
}
