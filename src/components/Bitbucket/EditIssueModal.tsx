import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BitbucketIssue } from '@shared/bitbucket'
import { ActionButton, FieldLabel, Modal, TextArea, TextInput } from '@/components/Ui/Modal'
import { useToastStore } from '@/stores/toast'

interface EditIssueModalProps {
  open: boolean
  issue: BitbucketIssue
  repoPath: string
  onClose: () => void
  onUpdated: () => void | Promise<void>
}

export function EditIssueModal({ open, issue, repoPath, onClose, onUpdated }: EditIssueModalProps) {
  const { t } = useTranslation()
  const showToast = useToastStore((s) => s.show)
  const [title, setTitle] = useState(issue.title)
  const [body, setBody] = useState(issue.body)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(issue.title)
    setBody(issue.body)
  }, [open, issue.number, issue.title, issue.body])

  async function handleSave() {
    if (!title.trim()) {
      showToast(t('bitbucket.issue.titleRequired'), 'error')
      return
    }
    setBusy(true)
    try {
      await window.gitfreddo.bitbucketUpdateIssue(repoPath, issue.number, {
        title: title.trim(),
        body
      })
      await onUpdated()
      showToast(t('bitbucket.issue.updated'), 'success')
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title={t('bitbucket.issue.editTitle', { number: issue.number })} onClose={onClose}>
      <div className="space-y-3 p-4">
        <div>
          <FieldLabel>{t('sidebar.title')}</FieldLabel>
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
        </div>
        <div>
          <FieldLabel>{t('sidebar.body')}</FieldLabel>
          <TextArea value={body} onChange={(e) => setBody(e.target.value)} rows={6} disabled={busy} />
        </div>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </ActionButton>
          <ActionButton variant="primary" loading={busy} onClick={() => void handleSave()}>
            {t('common.save')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
