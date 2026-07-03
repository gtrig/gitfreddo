import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Modal, ActionButton, FieldLabel, TextInput } from '@/components/ui/Modal'
import { LoadingRow } from '@/components/ui/Spinner'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import type { GitBisectStatus } from '@/lib/types'

interface BisectPanelModalProps {
  open: boolean
  onClose: () => void
}

export function BisectPanelModal({ open, onClose }: BisectPanelModalProps) {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const showToast = useToastStore((s) => s.show)
  const { bisectStart, bisectGood, bisectBad, bisectReset } = useGitMutations()

  const [badRef, setBadRef] = useState('')
  const [goodRef, setGoodRef] = useState('')

  const statusQuery = useQuery({
    queryKey: ['repo', repoPath, 'bisect.status'],
    queryFn: async () =>
      (await window.gitfreddo.invoke('bisect.status')) as GitBisectStatus,
    enabled: open && connected && Boolean(repoPath)
  })

  useEffect(() => {
    if (!open) {
      setBadRef('')
      setGoodRef('')
    }
  }, [open])

  const busy =
    bisectStart.isPending ||
    bisectGood.isPending ||
    bisectBad.isPending ||
    bisectReset.isPending

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      showToast(success, 'success')
      await statusQuery.refetch()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  const status = statusQuery.data

  return (
    <Modal open={open} title={t('modals.bisect.title')} onClose={onClose} size="lg">
      {statusQuery.isLoading && <LoadingRow label={t('modals.bisect.loading')} />}
      {statusQuery.error && (
        <p className="text-sm text-red-400">
          {statusQuery.error instanceof Error
            ? statusQuery.error.message
            : t('modals.bisect.loadFailed')}
        </p>
      )}

      {status && (
        <div className="space-y-4">
          <p className="text-sm text-gf-fg-muted">
            {status.active ? t('modals.bisect.activeHint') : t('modals.bisect.inactiveHint')}
          </p>

          {status.active && (
            <div className="rounded border border-gf-border bg-gf-bg-deep px-3 py-2 text-xs text-gf-fg-muted">
              {status.current && (
                <p>
                  {t('modals.bisect.current')}{' '}
                  <span className="font-mono text-gf-fg">{status.current.slice(0, 7)}</span>
                </p>
              )}
              {status.good && (
                <p>
                  {t('modals.bisect.good')}{' '}
                  <span className="font-mono text-gf-fg">{status.good.slice(0, 7)}</span>
                </p>
              )}
              {status.bad && (
                <p>
                  {t('modals.bisect.bad')}{' '}
                  <span className="font-mono text-gf-fg">{status.bad.slice(0, 7)}</span>
                </p>
              )}
            </div>
          )}

          {!status.active && (
            <div className="space-y-3">
              <div>
                <FieldLabel>{t('modals.bisect.badCommit')}</FieldLabel>
                <TextInput
                  value={badRef}
                  onChange={(event) => setBadRef(event.target.value)}
                  placeholder={t('modals.bisect.badPlaceholder')}
                />
              </div>
              <div>
                <FieldLabel>{t('modals.bisect.goodCommit')}</FieldLabel>
                <TextInput
                  value={goodRef}
                  onChange={(event) => setGoodRef(event.target.value)}
                  placeholder={t('modals.bisect.goodPlaceholder')}
                />
              </div>
              <ActionButton
                variant="primary"
                loading={bisectStart.isPending}
                disabled={!badRef.trim() || busy}
                onClick={() =>
                  void run(
                    () =>
                      bisectStart.mutateAsync({
                        badRef: badRef.trim(),
                        ...(goodRef.trim() ? { goodRef: goodRef.trim() } : {})
                      }),
                    t('modals.bisect.started')
                  )
                }
              >
                {t('modals.bisect.startBisect')}
              </ActionButton>
            </div>
          )}

          {status.active && (
            <div className="flex flex-wrap gap-2">
              <ActionButton
                loading={bisectGood.isPending}
                disabled={busy}
                onClick={() => void run(() => bisectGood.mutateAsync({}), t('modals.bisect.markedGood'))}
              >
                {t('modals.bisect.markGood')}
              </ActionButton>
              <ActionButton
                loading={bisectBad.isPending}
                disabled={busy}
                onClick={() => void run(() => bisectBad.mutateAsync({}), t('modals.bisect.markedBad'))}
              >
                {t('modals.bisect.markBad')}
              </ActionButton>
              <ActionButton
                variant="danger"
                loading={bisectReset.isPending}
                disabled={busy}
                onClick={() => void run(() => bisectReset.mutateAsync({}), t('modals.bisect.reset'))}
              >
                {t('modals.bisect.resetBisect')}
              </ActionButton>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <ActionButton onClick={onClose}>{t('common.close')}</ActionButton>
      </div>
    </Modal>
  )
}
