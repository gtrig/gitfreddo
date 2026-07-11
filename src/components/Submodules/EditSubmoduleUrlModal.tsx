import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton, Checkbox } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'

interface EditSubmoduleUrlModalProps {
  open: boolean
  submodulePath: string
  currentUrl: string
  onClose: () => void
}

export function EditSubmoduleUrlModal({
  open,
  submodulePath,
  currentUrl,
  onClose
}: EditSubmoduleUrlModalProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState(currentUrl)
  const [syncAfter, setSyncAfter] = useState(true)
  const { submoduleSetUrl, submoduleSync } = useGitMutations()
  const show = useToastStore((s) => s.show)

  useEffect(() => {
    if (open) {
      setUrl(currentUrl)
      setSyncAfter(true)
    }
  }, [open, currentUrl])

  function handleClose() {
    setUrl(currentUrl)
    onClose()
  }

  return (
    <Modal
      open={open}
      title={t('modals.editSubmoduleUrl.title', { path: submodulePath })}
      onClose={handleClose}
    >
      <div className="space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('modals.editSubmoduleUrl.url')}</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            placeholder="https://github.com/user/repo.git"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={syncAfter} onChange={(e) => setSyncAfter(e.target.checked)} />
          <span className="text-gf-fg-muted">{t('modals.editSubmoduleUrl.syncAfter')}</span>
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            loading={submoduleSetUrl.isPending || submoduleSync.isPending}
            disabled={!url.trim()}
            onClick={async () => {
              try {
                await submoduleSetUrl.mutateAsync({ path: submodulePath, url: url.trim() })
                if (syncAfter) {
                  await submoduleSync.mutateAsync({ paths: [submodulePath] })
                }
                show(t('modals.editSubmoduleUrl.updated', { path: submodulePath }), 'success')
                handleClose()
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                show(message || t('modals.editSubmoduleUrl.failed'), 'error')
              }
            }}
          >
            {t('common.save')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
