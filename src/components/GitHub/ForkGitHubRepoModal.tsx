import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GitHubRepo } from '@shared/github'
import { parseGitHubRemote } from '@shared/github'
import { ActionButton, FieldLabel, Modal, TextInput } from '@/components/Ui/Modal'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'
import { useToastStore } from '@/stores/toast'

interface ForkGitHubRepoModalProps {
  open: boolean
  initialUrl?: string
  onClose: () => void
  onForked: (repo: GitHubRepo) => void | Promise<void>
}

export function ForkGitHubRepoModal({
  open,
  initialUrl = '',
  onClose,
  onForked
}: ForkGitHubRepoModalProps) {
  const { t } = useTranslation()
  const { data: status } = useGitHubStatus()
  const showToast = useToastStore((s) => s.show)
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const parsed = parseGitHubRemote(initialUrl)
    setOwner(parsed?.owner ?? '')
    setRepo(parsed?.repo ?? '')
  }, [open, initialUrl])

  async function handleFork() {
    if (!owner.trim() || !repo.trim()) {
      showToast(t('github.fork.missingFields'), 'error')
      return
    }
    setBusy(true)
    try {
      const forked = await window.gitfreddo.githubForkRepo(owner.trim(), repo.trim())
      await onForked(forked)
      showToast(t('github.fork.success'), 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!status?.connected) {
    return (
      <Modal open={open} title={t('github.fork.title')} onClose={onClose}>
        <p className="p-4 text-sm text-gf-fg-subtle">{t('github.fork.connectFirst')}</p>
      </Modal>
    )
  }

  return (
    <Modal open={open} title={t('github.fork.title')} onClose={onClose}>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">{t('github.fork.description')}</p>
        <div>
          <FieldLabel>{t('github.fork.owner')}</FieldLabel>
          <TextInput value={owner} onChange={(e) => setOwner(e.target.value)} disabled={busy} />
        </div>
        <div>
          <FieldLabel>{t('github.fork.repo')}</FieldLabel>
          <TextInput value={repo} onChange={(e) => setRepo(e.target.value)} disabled={busy} />
        </div>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </ActionButton>
          <ActionButton variant="primary" loading={busy} onClick={() => void handleFork()}>
            {t('github.fork.action')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
