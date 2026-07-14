import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionButton, FieldLabel, Modal, TextInput } from '@/components/Ui/Modal'

export interface RenameEntityModalProps {
  open: boolean
  currentName: string
  displayName?: string
  titleKey: string
  renameKey: string
  newNameKey: string
  isPending: boolean
  onClose: () => void
  onRename: (newName: string) => Promise<void>
  normalizeCurrentName?: (name: string) => string
}

export function RenameEntityModal({
  open,
  currentName,
  displayName,
  titleKey,
  renameKey,
  newNameKey,
  isPending,
  onClose,
  onRename,
  normalizeCurrentName
}: RenameEntityModalProps) {
  const { t } = useTranslation()
  const shortCurrent = displayName ?? (normalizeCurrentName?.(currentName) ?? currentName)
  const [name, setName] = useState(shortCurrent)

  useEffect(() => {
    if (open) setName(shortCurrent)
  }, [open, shortCurrent])

  const handleClose = () => {
    setName('')
    onClose()
  }

  const trimmed = name.trim()
  const canSubmit = trimmed.length > 0 && trimmed !== shortCurrent

  return (
    <Modal open={open} title={t(titleKey)} onClose={handleClose}>
      <div className="space-y-3">
        <p className="text-xs text-gf-fg-subtle">
          {t(renameKey)} <span className="font-mono text-gf-fg-muted">{shortCurrent}</span>
        </p>
        <label className="block text-sm">
          <FieldLabel>{t(newNameKey)}</FieldLabel>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            loading={isPending}
            disabled={!canSubmit}
            onClick={async () => {
              if (!canSubmit) return
              await onRename(trimmed)
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
