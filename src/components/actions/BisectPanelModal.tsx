import { useEffect, useState } from 'react'
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
    <Modal open={open} title="Git bisect" onClose={onClose} size="lg">
      {statusQuery.isLoading && <LoadingRow label="Loading bisect status…" />}
      {statusQuery.error && (
        <p className="text-sm text-red-400">
          {statusQuery.error instanceof Error ? statusQuery.error.message : 'Failed to load status.'}
        </p>
      )}

      {status && (
        <div className="space-y-4">
          <p className="text-sm text-gf-fg-muted">
            {status.active
              ? 'Bisect is active. Mark commits as good or bad, then reset when finished.'
              : 'Start bisect with a known bad commit and optionally a known good commit.'}
          </p>

          {status.active && (
            <div className="rounded border border-gf-border bg-gf-bg-deep px-3 py-2 text-xs text-gf-fg-muted">
              {status.current && (
                <p>
                  Current: <span className="font-mono text-gf-fg">{status.current.slice(0, 7)}</span>
                </p>
              )}
              {status.good && (
                <p>
                  Good: <span className="font-mono text-gf-fg">{status.good.slice(0, 7)}</span>
                </p>
              )}
              {status.bad && (
                <p>
                  Bad: <span className="font-mono text-gf-fg">{status.bad.slice(0, 7)}</span>
                </p>
              )}
            </div>
          )}

          {!status.active && (
            <div className="space-y-3">
              <div>
                <FieldLabel>Bad commit (required)</FieldLabel>
                <TextInput
                  value={badRef}
                  onChange={(event) => setBadRef(event.target.value)}
                  placeholder="HEAD or commit hash"
                />
              </div>
              <div>
                <FieldLabel>Good commit (optional)</FieldLabel>
                <TextInput
                  value={goodRef}
                  onChange={(event) => setGoodRef(event.target.value)}
                  placeholder="Older known-good commit"
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
                    'Bisect started.'
                  )
                }
              >
                Start bisect
              </ActionButton>
            </div>
          )}

          {status.active && (
            <div className="flex flex-wrap gap-2">
              <ActionButton
                loading={bisectGood.isPending}
                disabled={busy}
                onClick={() => void run(() => bisectGood.mutateAsync({}), 'Marked good.')}
              >
                Mark current good
              </ActionButton>
              <ActionButton
                loading={bisectBad.isPending}
                disabled={busy}
                onClick={() => void run(() => bisectBad.mutateAsync({}), 'Marked bad.')}
              >
                Mark current bad
              </ActionButton>
              <ActionButton
                variant="danger"
                loading={bisectReset.isPending}
                disabled={busy}
                onClick={() => void run(() => bisectReset.mutateAsync({}), 'Bisect reset.')}
              >
                Reset bisect
              </ActionButton>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <ActionButton onClick={onClose}>Close</ActionButton>
      </div>
    </Modal>
  )
}
