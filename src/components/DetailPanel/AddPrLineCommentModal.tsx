import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionButton, FieldLabel, Modal, TextArea } from '@/components/Ui/Modal'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import type { GitHubPullRequestRepository, GitHubPullRequestReviewCommentSide } from '@shared/github'

interface AddPrLineCommentModalProps {
  prNumber: number
  repository: GitHubPullRequestRepository
  commitId: string
  path: string
  line: number
  side: GitHubPullRequestReviewCommentSide
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export function AddPrLineCommentModal({
  prNumber,
  repository,
  commitId,
  path,
  line,
  side,
  open,
  onClose,
  onSaved
}: AddPrLineCommentModalProps) {
  const { t } = useTranslation()
  const showToast = useToastStore((s) => s.show)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open) return
    setMessage('')
  }, [open, path, line, side])

  async function handleSubmit() {
    if (!message.trim()) {
      showToast(t('modals.addPrLineComment.emptyMessage'), 'error')
      return
    }

    try {
      const repoPath = useWorkspaceStore.getState().activePath
      if (!repoPath) throw new Error('No repository connected')
      await window.gitfreddo.githubPostPullRequestReviewComment(repoPath, prNumber, {
        body: message.trim(),
        commitId,
        path,
        line,
        side
      }, repository)
      onSaved?.()
      showToast(t('modals.addPrLineComment.saved'), 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  return (
    <Modal
      open={open}
      title={t('modals.addPrLineComment.title', { number: prNumber })}
      onClose={onClose}
      size="lg"
    >
      <p className="mb-2 text-sm text-gf-fg-muted">{t('modals.addPrLineComment.description')}</p>
      <p className="mb-4 font-mono text-xs text-gf-fg-subtle">
        {path}:{line} ({side === 'RIGHT' ? t('modals.addPrLineComment.after') : t('modals.addPrLineComment.before')})
      </p>

      <div>
        <FieldLabel>{t('modals.addPrLineComment.message')}</FieldLabel>
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('modals.addPrLineComment.placeholder')}
          rows={6}
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <ActionButton onClick={onClose}>{t('common.cancel')}</ActionButton>
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
