import { useQuery } from '@tanstack/react-query'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { LoadingRow } from '@/components/ui/Spinner'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import type { GitReflogEntry } from '@/lib/types'

interface ReflogModalProps {
  open: boolean
  onClose: () => void
}

export function ReflogModal({ open, onClose }: ReflogModalProps) {
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)

  const { data, isLoading, error } = useQuery({
    queryKey: ['repo', repoPath, 'reflog.list'],
    queryFn: async () =>
      (await window.gitfredo.invoke('reflog.list', { maxCount: 200 })) as GitReflogEntry[],
    enabled: open && connected && Boolean(repoPath)
  })

  return (
    <Modal open={open} title="Reflog" onClose={onClose} size="lg">
      {isLoading && <LoadingRow label="Loading reflog…" />}
      {error && (
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : 'Failed to load reflog.'}
        </p>
      )}
      {data && (
        <div className="max-h-96 overflow-y-auto rounded border border-gf-border">
          {data.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gf-fg-subtle">Reflog is empty.</p>
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
                <span className="text-sm text-gf-fg">{entry.subject || '(no message)'}</span>
                {entry.timestamp && (
                  <span className="text-xs text-gf-fg-subtle">{entry.timestamp}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <ActionButton onClick={onClose}>Close</ActionButton>
      </div>
    </Modal>
  )
}
