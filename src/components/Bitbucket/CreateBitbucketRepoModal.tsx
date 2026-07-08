import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BitbucketRepo } from '@shared/bitbucket'
import { ActionButton, Modal, Select } from '@/components/Ui/Modal'
import { useBitbucketStatus } from '@/hooks/useBitbucketStatus'
import { useBitbucketWorkspaces } from '@/hooks/useBitbucketRepos'

export interface CreateBitbucketRepoModalProps {
  open: boolean
  onClose: () => void
  onCreated: (repo: BitbucketRepo) => void | Promise<void>
  submitLabel?: string
}

export function CreateBitbucketRepoModal({
  open,
  onClose,
  onCreated,
  submitLabel
}: CreateBitbucketRepoModalProps) {
  const { t } = useTranslation()
  const { data: status } = useBitbucketStatus()
  const { data: workspaces } = useBitbucketWorkspaces(open && Boolean(status?.connected))
  const [workspace, setWorkspace] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resolvedSubmitLabel = submitLabel ?? t('bitbucket.repo.create')

  useEffect(() => {
    if (!open) return
    setName('')
    setDescription('')
    setIsPrivate(false)
    setError(null)
  }, [open])

  useEffect(() => {
    if (!workspace && workspaces?.length) {
      setWorkspace(workspaces[0])
    }
  }, [workspace, workspaces])

  async function handleSubmit() {
    if (!workspace.trim() || !name.trim()) {
      setError(t('bitbucket.repo.nameRequired'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const repo = await window.gitfreddo.bitbucketCreateRepo({
        workspace: workspace.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        private: isPrivate
      })
      await onCreated(repo)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (!status?.connected) {
    return (
      <Modal open={open} title={t('workspace.hub.createBitbucket.title')} onClose={onClose}>
        <p className="p-4 text-sm text-gf-fg-subtle">{t('bitbucket.repo.connectFirst')}</p>
      </Modal>
    )
  }

  return (
    <Modal open={open} title={t('workspace.hub.createBitbucket.title')} onClose={onClose}>
      <div className="space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('bitbucket.repo.workspace')}</span>
          <Select
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            className="mt-1 bg-gf-bg px-2 py-1.5"
          >
            {(workspaces ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('bitbucket.repo.name')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            placeholder={t('bitbucket.repo.namePlaceholder')}
            autoFocus
          />
        </label>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('bitbucket.repo.descriptionOptional')}</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            placeholder={t('bitbucket.repo.descriptionPlaceholder')}
          />
        </label>
        <div className="flex gap-2">
          {(['public', 'private'] as const).map((visibility) => (
            <button
              key={visibility}
              type="button"
              onClick={() => setIsPrivate(visibility === 'private')}
              className={`rounded border px-3 py-1.5 text-xs ${
                (visibility === 'private') === isPrivate
                  ? 'border-gf-accent bg-gf-accent/10 text-gf-fg'
                  : 'border-gf-border-strong text-gf-fg-muted hover:bg-gf-surface-hover'
              }`}
            >
              {t(`bitbucket.repo.${visibility}`)}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose}>{t('common.cancel')}</ActionButton>
          <ActionButton variant="primary" onClick={() => void handleSubmit()} disabled={busy}>
            {busy ? t('common.creating') : resolvedSubmitLabel}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
