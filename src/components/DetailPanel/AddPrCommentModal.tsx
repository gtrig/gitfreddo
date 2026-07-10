import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionButton, FieldLabel, Modal, TextArea } from '@/components/Ui/Modal'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'

interface AddPrCommentModalProps {
  prNumber: number
  open: boolean
  onClose: () => void
}

export function AddPrCommentModal({ prNumber, open, onClose }: AddPrCommentModalProps) {
  const { t } = useTranslation()
  const showToast = useToastStore((s) => s.show)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open) return
    setMessage('')
  }, [open])

  async function handleSubmit() {
    if (!message.trim()) {
      showToast(t('modals.addPrComment.emptyMessage'), 'error')
      return
    }

    try {
      const repoPath = useWorkspaceStore.getState().activePath
      if (!repoPath) throw new Error('No repository connected')
      await window.gitfreddo.githubPostPullRequestComment(repoPath, prNumber, message.trim())
      showToast(t('modals.addPrComment.saved'), 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  return (
    <Modal
      open={open}
      title={t('modals.addPrComment.title', { number: prNumber })}
      onClose={onClose}
      size="lg"
    >
      <p className="mb-4 text-sm text-gf-fg-muted">{t('modals.addPrComment.description')}</p>

      <div>
        <FieldLabel>{t('modals.addPrComment.message')}</FieldLabel>
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('modals.addPrComment.placeholder', { number: prNumber })}
          rows={6}
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <ActionButton onClick={onClose}>
          {t('common.cancel')}
        </ActionButton>
        <ActionButton
          variant="primary"
          disabled={!message.trim()}
          onClick={() => void handleSubmit()}
        >
          {t('common.save')}
        </ActionButton>
      </div>
    </Modal>
  )
}