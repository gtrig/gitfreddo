import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Modal, ActionButton, Checkbox } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkspaceStore } from '@/stores/workspace'

interface CreateTagModalProps {
  open: boolean
  onClose: () => void
  target?: string
}

export function CreateTagModal({ open, onClose, target }: CreateTagModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [sign, setSign] = useState(false)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { createTag } = useGitMutations()
  const gpgSignQuery = useQuery({
    queryKey: ['repo', repoPath, 'config.get', 'tag.gpgsign'],
    queryFn: async () =>
      (
        await window.gitfreddo.invoke('config.get', {
          key: 'tag.gpgsign',
          scope: 'local'
        })
      ) as string,
    enabled: open && Boolean(repoPath)
  })
  const defaultSign =
    gpgSignQuery.data?.trim().toLowerCase() === 'true' ||
    gpgSignQuery.data?.trim() === '1' ||
    gpgSignQuery.data?.trim().toLowerCase() === 'if-asked'

  const handleClose = () => {
    setName('')
    setMessage('')
    setSign(false)
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
        <label className="flex items-center gap-2 text-sm text-gf-fg-muted">
          <Checkbox
            checked={sign || defaultSign}
            onChange={(e) => setSign(e.target.checked)}
          />
          {t('modals.createTag.signTag')}
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
                ...(message.trim() ? { message: message.trim() } : {}),
                ...((sign || defaultSign) && message.trim() ? { sign: true } : {})
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
