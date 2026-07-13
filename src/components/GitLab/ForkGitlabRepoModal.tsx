import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GitlabRepo } from '@shared/gitlab'
import { parseGitlabRemote } from '@shared/gitlab'
import { ActionButton, FieldLabel, Modal, TextInput } from '@/components/Ui/Modal'
import { useGitlabStatus } from '@/hooks/useGitlabStatus'
import { useToastStore } from '@/stores/toast'

interface ForkGitlabRepoModalProps {
  open: boolean
  initialUrl?: string
  onClose: () => void
  onForked: (repo: GitlabRepo) => void | Promise<void>
}

export function ForkGitlabRepoModal({
  open,
  initialUrl = '',
  onClose,
  onForked
}: ForkGitlabRepoModalProps) {
  const { t } = useTranslation()
  const { data: status } = useGitlabStatus()
  const showToast = useToastStore((s) => s.show)
  const [namespace, setNamespace] = useState('')
  const [repo, setRepo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const parsed = parseGitlabRemote(initialUrl, status?.host)
    setNamespace(parsed?.namespace ?? '')
    setRepo(parsed?.repo ?? '')
  }, [open, initialUrl, status?.host])

  async function handleFork() {
    if (!namespace.trim() || !repo.trim()) {
      showToast(t('gitlab.fork.missingFields'), 'error')
      return
    }
    setBusy(true)
    try {
      const forked = await window.gitfreddo.gitlabForkRepo(namespace.trim(), repo.trim())
      await onForked(forked)
      showToast(t('gitlab.fork.success'), 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!status?.connected) {
    return (
      <Modal open={open} title={t('gitlab.fork.title')} onClose={onClose}>
        <p className="p-4 text-sm text-gf-fg-subtle">{t('gitlab.fork.connectFirst')}</p>
      </Modal>
    )
  }

  return (
    <Modal open={open} title={t('gitlab.fork.title')} onClose={onClose}>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">{t('gitlab.fork.description')}</p>
        <div>
          <FieldLabel>{t('gitlab.fork.namespace')}</FieldLabel>
          <TextInput value={namespace} onChange={(e) => setNamespace(e.target.value)} disabled={busy} />
        </div>
        <div>
          <FieldLabel>{t('gitlab.fork.repo')}</FieldLabel>
          <TextInput value={repo} onChange={(e) => setRepo(e.target.value)} disabled={busy} />
        </div>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </ActionButton>
          <ActionButton variant="primary" loading={busy} onClick={() => void handleFork()}>
            {t('gitlab.fork.action')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
