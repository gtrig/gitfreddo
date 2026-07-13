import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GitlabRepo } from '@shared/gitlab'
import { ActionButton, Modal, Select } from '@/components/Ui/Modal'
import { useGitlabStatus } from '@/hooks/useGitlabStatus'
import { useGitlabNamespaces } from '@/hooks/useGitlabRepos'

export interface CreateGitlabRepoModalProps {
  open: boolean
  onClose: () => void
  onCreated: (repo: GitlabRepo) => void | Promise<void>
  submitLabel?: string
}

export function CreateGitlabRepoModal({
  open,
  onClose,
  onCreated,
  submitLabel
}: CreateGitlabRepoModalProps) {
  const { t } = useTranslation()
  const { data: status } = useGitlabStatus()
  const { data: namespaces } = useGitlabNamespaces(open && Boolean(status?.connected))
  const [namespace, setNamespace] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resolvedSubmitLabel = submitLabel ?? t('gitlab.repo.create')

  useEffect(() => {
    if (!open) return
    setName('')
    setDescription('')
    setIsPrivate(false)
    setError(null)
  }, [open])

  useEffect(() => {
    if (!namespace && namespaces?.length) {
      setNamespace(namespaces[0])
    }
  }, [namespace, namespaces])

  async function handleSubmit() {
    if (!namespace.trim() || !name.trim()) {
      setError(t('gitlab.repo.nameRequired'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const repo = await window.gitfreddo.gitlabCreateRepo({
        namespace: namespace.trim(),
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
      <Modal open={open} title={t('workspace.hub.createGitlab.title')} onClose={onClose}>
        <p className="p-4 text-sm text-gf-fg-subtle">{t('gitlab.repo.connectFirst')}</p>
      </Modal>
    )
  }

  return (
    <Modal open={open} title={t('workspace.hub.createGitlab.title')} onClose={onClose}>
      <div className="space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('gitlab.repo.namespace')}</span>
          <Select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="mt-1 bg-gf-bg px-2 py-1.5"
          >
            {(namespaces ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('gitlab.repo.name')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            placeholder={t('gitlab.repo.namePlaceholder')}
            autoFocus
          />
        </label>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('gitlab.repo.descriptionOptional')}</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            placeholder={t('gitlab.repo.descriptionPlaceholder')}
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
              {t(`gitlab.repo.${visibility}`)}
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
