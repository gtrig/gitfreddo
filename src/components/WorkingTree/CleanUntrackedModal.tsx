import { useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useCleanPreview } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { LoadingRow } from '@/components/ui/Spinner'

interface CleanUntrackedModalProps {
  open: boolean
  onClose: () => void
}

export function CleanUntrackedModal({ open, onClose }: CleanUntrackedModalProps) {
  const [includeIgnored, setIncludeIgnored] = useState(false)
  const { data: preview, isLoading, error } = useCleanPreview(includeIgnored, open)
  const { workingClean } = useGitMutations()

  const fileCount = preview?.length ?? 0

  return (
    <Modal open={open} title="Clean untracked files" onClose={onClose}>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">
          Permanently remove untracked files and directories from the working tree. This cannot be
          undone.
        </p>
        <label className="flex items-center gap-2 text-sm text-gf-fg-muted">
          <input
            type="checkbox"
            checked={includeIgnored}
            onChange={(e) => setIncludeIgnored(e.target.checked)}
          />
          Include ignored files (<span className="font-mono text-xs">git clean -x</span>)
        </label>
        {isLoading && <LoadingRow label="Loading preview…" />}
        {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
        {!isLoading && !error && (
          <div className="max-h-48 overflow-y-auto rounded border border-gf-border bg-gf-bg-deep p-2">
            {fileCount === 0 ? (
              <p className="text-xs text-gf-fg-subtle">No files would be removed.</p>
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
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton
            variant="primary"
            disabled={fileCount === 0}
            loading={workingClean.isPending}
            onClick={async () => {
              await workingClean.mutateAsync({ includeIgnored })
              onClose()
            }}
          >
            Remove {fileCount} file{fileCount === 1 ? '' : 's'}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
