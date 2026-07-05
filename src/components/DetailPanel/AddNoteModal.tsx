import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionButton, FieldLabel, Modal, TextArea } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'
import type { GitCommit } from '@/lib/types'

interface AddNoteModalProps {
  commit: GitCommit
  open: boolean
  onClose: () => void
}

export function AddNoteModal({ commit, open, onClose }: AddNoteModalProps) {
  const { t } = useTranslation()
  const { notesAdd } = useGitMutations()
  const showToast = useToastStore((s) => s.show)
  const [message, setMessage] = useState('')
  const hasExistingNote = Boolean(commit.notes.trim())
  const busy = notesAdd.isPending

  useEffect(() => {
    if (!open) return
    setMessage(commit.notes.trim())
  }, [open, commit.hash, commit.notes])

  async function handleSubmit() {
    if (!message.trim()) {
      showToast(t('modals.addNote.emptyMessage'), 'error')
      return
    }

    try {
      await notesAdd.mutateAsync({
        hash: commit.hash,
        message: message.trim(),
        force: hasExistingNote
      })
      showToast(t('modals.addNote.saved'), 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  return (
    <Modal
      open={open}
      title={hasExistingNote ? t('modals.addNote.editTitle') : t('modals.addNote.addTitle')}
      onClose={onClose}
      size="lg"
    >
      <p className="mb-4 text-sm text-gf-fg-muted">
        {t('modals.addNote.description', { hash: commit.shortHash })}
      </p>

      <div>
        <FieldLabel>{t('modals.addNote.message')}</FieldLabel>
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('modals.addNote.placeholder')}
          rows={6}
          disabled={busy}
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <ActionButton onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </ActionButton>
        <ActionButton
          variant="primary"
          loading={busy}
          disabled={!message.trim()}
          onClick={() => void handleSubmit()}
        >
          {t('common.save')}
        </ActionButton>
      </div>
    </Modal>
  )
}
