import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Modal, ActionButton } from '@/components/Ui/Modal'
import { LoadingRow } from '@/components/Ui/Spinner'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { shouldVirtualize, VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'
import type { GitReflogEntry } from '@/lib/types'

interface ReflogModalProps {
  open: boolean
  onClose: () => void
}

export function ReflogModal({ open, onClose }: ReflogModalProps) {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)

  const { data, isLoading, error } = useQuery({
    queryKey: ['repo', repoPath, 'reflog.list'],
    queryFn: async () =>
      (await window.gitfreddo.invoke('reflog.list', { maxCount: 200 })) as GitReflogEntry[],
    enabled: open && connected && Boolean(repoPath)
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const entries = data ?? []
  const useVirtualization = shouldVirtualize(entries.length)

  const virtualizer = useVirtualizer({
    count: useVirtualization ? entries.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: VIRTUAL_OVERSCAN
  })

  return (
    <Modal open={open} title={t('modals.reflog.title')} onClose={onClose} size="lg">
      {isLoading && <LoadingRow label={t('modals.reflog.loading')} />}
      {error && (
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : t('modals.reflog.loadFailed')}
        </p>
      )}
      {data && (
        <div ref={scrollRef} className="max-h-96 overflow-y-auto rounded border border-gf-border">
          {data.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gf-fg-subtle">{t('modals.reflog.empty')}</p>
          ) : useVirtualization ? (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const entry = entries[virtualItem.index]!
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%',
                      transform: `translateY(${virtualItem.start}px)`
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        selectTimelineNode('commit', entry.hash)
                        onClose()
                      }}
                      className="flex w-full flex-col gap-0.5 border-b border-gf-border/60 px-3 py-2 text-left hover:bg-gf-surface-hover last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gf-accent-fg">{entry.selector}</span>
                        <span className="font-mono text-xs text-gf-fg-muted">{entry.shortHash}</span>
                      </div>
                      <span className="text-sm text-gf-fg">{entry.subject || t('modals.reflog.noMessage')}</span>
                      {entry.timestamp && (
                        <span className="text-xs text-gf-fg-subtle">{entry.timestamp}</span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            data.map((entry) => (
              <button
                key={`${entry.selector}-${entry.hash}`}
                type="button"
                onClick={() => {
                  selectTimelineNode('commit', entry.hash)
                  onClose()
                }}
                className="flex w-full flex-col gap-0.5 border-b border-gf-border/60 px-3 py-2 text-left hover:bg-gf-surface-hover last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gf-accent-fg">{entry.selector}</span>
                  <span className="font-mono text-xs text-gf-fg-muted">{entry.shortHash}</span>
                </div>
                <span className="text-sm text-gf-fg">{entry.subject || t('modals.reflog.noMessage')}</span>
                {entry.timestamp && (
                  <span className="text-xs text-gf-fg-subtle">{entry.timestamp}</span>
                )}
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
