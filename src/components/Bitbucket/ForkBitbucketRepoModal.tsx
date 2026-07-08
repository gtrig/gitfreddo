import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BitbucketRepo } from '@shared/bitbucket'
import { parseBitbucketRemote } from '@shared/bitbucket'
import { ActionButton, FieldLabel, Modal, TextInput } from '@/components/Ui/Modal'
import { useBitbucketStatus } from '@/hooks/useBitbucketStatus'
import { useToastStore } from '@/stores/toast'

interface ForkBitbucketRepoModalProps {
  open: boolean
  initialUrl?: string
  onClose: () => void
  onForked: (repo: BitbucketRepo) => void | Promise<void>
}

export function ForkBitbucketRepoModal({
  open,
  initialUrl = '',
  onClose,
  onForked
}: ForkBitbucketRepoModalProps) {
  const { t } = useTranslation()
  const { data: status } = useBitbucketStatus()
  const showToast = useToastStore((s) => s.show)
  const [workspace, setWorkspace] = useState('')
  const [repo, setRepo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const parsed = parseBitbucketRemote(initialUrl)
    setWorkspace(parsed?.workspace ?? '')
    setRepo(parsed?.repo ?? '')
  }, [open, initialUrl])

  async function handleFork() {
    if (!workspace.trim() || !repo.trim()) {
      showToast(t('bitbucket.fork.missingFields'), 'error')
      return
    }
    setBusy(true)
    try {
      const forked = await window.gitfreddo.bitbucketForkRepo(workspace.trim(), repo.trim())
      await onForked(forked)
      showToast(t('bitbucket.fork.success'), 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!status?.connected) {
    return (
      <Modal open={open} title={t('bitbucket.fork.title')} onClose={onClose}>
        <p className="p-4 text-sm text-gf-fg-subtle">{t('bitbucket.fork.connectFirst')}</p>
      </Modal>
    )
  }

  return (
    <Modal open={open} title={t('bitbucket.fork.title')} onClose={onClose}>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">{t('bitbucket.fork.description')}</p>
        <div>
          <FieldLabel>{t('bitbucket.fork.workspace')}</FieldLabel>
          <TextInput value={workspace} onChange={(e) => setWorkspace(e.target.value)} disabled={busy} />
        </div>
        <div>
          <FieldLabel>{t('bitbucket.fork.repo')}</FieldLabel>
          <TextInput value={repo} onChange={(e) => setRepo(e.target.value)} disabled={busy} />
        </div>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </ActionButton>
          <ActionButton variant="primary" loading={busy} onClick={() => void handleFork()}>
            {t('bitbucket.fork.action')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
