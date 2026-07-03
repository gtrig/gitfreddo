import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { localTagName } from '@/lib/format/tagNames'

interface RenameTagModalProps {
  open: boolean
  currentName: string
  onClose: () => void
}

export function RenameTagModal({ open, currentName, onClose }: RenameTagModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(localTagName(currentName))
  const { renameTag } = useGitMutations()

  useEffect(() => {
    if (open) setName(localTagName(currentName))
  }, [open, currentName])

  const trimmed = name.trim()
  const shortCurrent = localTagName(currentName)
  const canSubmit = trimmed.length > 0 && trimmed !== shortCurrent

  function handleClose() {
    setName('')
    onClose()
  }

  return (
    <Modal open={open} title={t('modals.renameTag.title')} onClose={handleClose}>
      <div className="space-y-3 p-4">
        <p className="text-xs text-gf-fg-subtle">
          {t('modals.renameTag.rename')}{' '}
          <span className="font-mono text-gf-fg-muted">{shortCurrent}</span>
        </p>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('modals.renameTag.newName')}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            autoFocus
          />
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            loading={renameTag.isPending}
            disabled={!canSubmit}
            onClick={async () => {
              if (!canSubmit) return
              await renameTag.mutateAsync({ oldName: currentName, newName: trimmed })
              handleClose()
            }}
          >
            {t('common.rename')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
