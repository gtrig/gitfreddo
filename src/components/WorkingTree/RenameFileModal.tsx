import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton, FieldLabel, TextInput } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface RenameFileModalProps {
  open: boolean
  oldPath: string
  onClose: () => void
}

export function RenameFileModal({ open, oldPath, onClose }: RenameFileModalProps) {
  const { t } = useTranslation()
  const { workingRename } = useGitMutations()
  const [newPath, setNewPath] = useState(oldPath)

  useEffect(() => {
    if (open) setNewPath(oldPath)
  }, [open, oldPath])

  const trimmed = newPath.trim()
  const canSubmit = trimmed.length > 0 && trimmed !== oldPath

  function handleClose() {
    setNewPath('')
    onClose()
  }

  const directory = useMemo(() => {
    const index = oldPath.lastIndexOf('/')
    return index >= 0 ? oldPath.slice(0, index + 1) : ''
  }, [oldPath])

  return (
    <Modal open={open} title={t('modals.renameFile.title')} onClose={handleClose}>
      <div className="space-y-3">
        <p className="text-xs text-gf-fg-subtle">
          {t('modals.renameFile.rename')}{' '}
          <span className="font-mono text-gf-fg-muted">{oldPath}</span>
        </p>
        <div>
          <FieldLabel>{t('modals.renameFile.newPath')}</FieldLabel>
          <TextInput
            value={newPath}
            onChange={(event) => setNewPath(event.target.value)}
            placeholder={directory ? `${directory}new-name` : 'new-name'}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            variant="primary"
            loading={workingRename.isPending}
            disabled={!canSubmit}
            onClick={async () => {
              if (!canSubmit) return
              await workingRename.mutateAsync({ oldPath, newPath: trimmed })
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
