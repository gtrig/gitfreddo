import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface CreateTagModalProps {
  open: boolean
  onClose: () => void
  target?: string
}

export function CreateTagModal({ open, onClose, target }: CreateTagModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const { createTag } = useGitMutations()

  const handleClose = () => {
    setName('')
    setMessage('')
    onClose()
  }

  return (
    <Modal open={open} title={t('modals.createTag.title')} onClose={handleClose}>
      <div className="space-y-3 p-4">
        {target && (
          <p className="text-xs text-gf-fg-subtle">
            {t('modals.createTag.pointAt')}{' '}
            <span className="font-mono text-gf-fg-muted">{target.slice(0, 7)}</span>
          </p>
        )}
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('modals.createTag.tagName')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="v1.0.0"
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('modals.createTag.messageOptional')}</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('modals.createTag.annotatedPlaceholder')}
            rows={3}
            className="mt-1 w-full resize-y rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
          />
          <p className="mt-1 text-xs text-gf-fg-subtle">{t('modals.createTag.lightweightHint')}</p>
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            loading={createTag.isPending}
            onClick={async () => {
              if (!name.trim()) return
              await createTag.mutateAsync({
                name: name.trim(),
                ...(target ? { target } : {}),
                ...(message.trim() ? { message: message.trim() } : {})
              })
              handleClose()
            }}
          >
            {t('common.create')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
