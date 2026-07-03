import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ActionButton, FieldLabel, TextArea } from '@/components/ui/Modal'
import { LoadingRow } from '@/components/ui/Spinner'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'

const REPO_FILES = [
  { path: '.gitignore', label: '.gitignore' },
  { path: '.gitattributes', label: '.gitattributes' }
] as const

export function RepoFilesPanel() {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const showToast = useToastStore((s) => s.show)
  const [selected, setSelected] = useState<(typeof REPO_FILES)[number]['path']>('.gitignore')
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const fileQuery = useQuery({
    queryKey: ['repo', repoPath, 'working.read', selected],
    queryFn: async () => (await window.gitfreddo.invoke('working.read', { path: selected })) as string,
    enabled: connected && Boolean(repoPath)
  })

  useEffect(() => {
    if (fileQuery.data !== undefined) {
      setDraft(fileQuery.data)
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

  const dirty = fileQuery.data !== undefined && draft !== fileQuery.data

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
      {fileQuery.data !== undefined && (
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
              {t('settings.repoFiles.save', { file: selected })}
            </ActionButton>
          </div>
        </>
      )}
    </div>
  )
}
