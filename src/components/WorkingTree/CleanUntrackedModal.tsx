import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useCleanPreview } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { LoadingRow } from '@/components/ui/Spinner'

interface CleanUntrackedModalProps {
  open: boolean
  onClose: () => void
}

export function CleanUntrackedModal({ open, onClose }: CleanUntrackedModalProps) {
  const { t } = useTranslation()
  const [includeIgnored, setIncludeIgnored] = useState(false)
  const { data: preview, isLoading, error } = useCleanPreview(includeIgnored, open)
  const { workingClean } = useGitMutations()

  const fileCount = preview?.length ?? 0

  return (
    <Modal open={open} title={t('workingTree.cleanUntrackedTitle')} onClose={onClose}>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">{t('workingTree.cleanUntrackedDescription')}</p>
        <label className="flex items-center gap-2 text-sm text-gf-fg-muted">
          <input
            type="checkbox"
            checked={includeIgnored}
            onChange={(e) => setIncludeIgnored(e.target.checked)}
          />
          {t('workingTree.includeIgnored')}
          <span className="font-mono text-xs">git clean -x</span>)
        </label>
        {isLoading && <LoadingRow label={t('workingTree.loadingPreview')} />}
        {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
        {!isLoading && !error && (
          <div className="max-h-48 overflow-y-auto rounded border border-gf-border bg-gf-bg-deep p-2">
            {fileCount === 0 ? (
              <p className="text-xs text-gf-fg-subtle">{t('workingTree.noFilesToRemove')}</p>
            ) : (
              <ul className="space-y-0.5 text-xs font-mono text-gf-fg-muted">
                {preview!.map((path) => (
                  <li key={path} className="truncate">
                    {path}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            variant="primary"
            disabled={fileCount === 0}
            loading={workingClean.isPending}
            onClick={async () => {
              await workingClean.mutateAsync({ includeIgnored })
              onClose()
            }}
          >
            {t('workingTree.removeFileCount', { count: fileCount })}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
