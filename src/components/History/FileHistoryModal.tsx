import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Modal, ActionButton } from '@/components/Ui/Modal'
import { LoadingRow } from '@/components/Ui/Spinner'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import type { GitCommit } from '@/lib/types'

interface FileHistoryModalProps {
  open: boolean
  path: string
  onClose: () => void
}

export function FileHistoryModal({ open, path, onClose }: FileHistoryModalProps) {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)

  const { data, isLoading, error } = useQuery({
    queryKey: ['repo', repoPath, 'log.file', path],
    queryFn: async () =>
      (await window.gitfreddo.invoke('log.file', { path, maxCount: 100 })) as GitCommit[],
    enabled: open && connected && Boolean(repoPath) && Boolean(path)
  })

  return (
    <Modal open={open} title={t('modals.fileHistory.title', { path })} onClose={onClose} size="lg">
      {isLoading && <LoadingRow label={t('modals.fileHistory.loading')} />}
      {error && (
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : t('modals.fileHistory.loadFailed')}
        </p>
      )}
      {data && (
        <div className="max-h-96 overflow-y-auto rounded border border-gf-border">
          {data.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gf-fg-subtle">{t('modals.fileHistory.noCommits')}</p>
          ) : (
            data.map((commit) => (
              <button
                key={commit.hash}
                type="button"
                onClick={() => {
                  selectTimelineNode('commit', commit.hash)
                  onClose()
                }}
                className="flex w-full flex-col gap-0.5 border-b border-gf-border/60 px-3 py-2 text-left hover:bg-gf-surface-hover last:border-b-0"
              >
                <span className="font-mono text-xs text-gf-fg-muted">{commit.shortHash}</span>
                <span className="text-sm text-gf-fg">{commit.subject}</span>
                <span className="text-xs text-gf-fg-subtle">
                  {commit.author.name} · {new Date(commit.author.date).toLocaleDateString()}
                </span>
              </button>
            ))
          )}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <ActionButton onClick={onClose}>{t('common.close')}</ActionButton>
      </div>
    </Modal>
  )
}
