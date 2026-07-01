import { useMemo } from 'react'
import { useSelectionStore } from '@/stores/selection'
import { useDiffCommitRange, useDiffShow, useDiffStaged, useDiffWorking } from '@/hooks/useGit'
import { UnifiedDiffView } from '@/components/DiffViewer/UnifiedDiffView'
import { parseUnifiedDiffRows } from '@/lib/unifiedDiff'
import type { GitDiffResult } from '@/lib/types'

interface DiffOverlayProps {
  onClose: () => void
}

export function DiffOverlay({ onClose }: DiffOverlayProps) {
  const selectedWorkingFile = useSelectionStore((s) => s.selectedWorkingFile)
  const selectedCommitFile = useSelectionStore((s) => s.selectedCommitFile)
  const selectedCommitHash = useSelectionStore((s) => s.selectedCommitHash)
  const diffMode = useSelectionStore((s) => s.diffMode)
  const selectedStashFile = useSelectionStore((s) => s.selectedStashFile)
  const compareCommitRange = useSelectionStore((s) => s.compareCommitRange)

  const workingDiff = useDiffWorking(
    diffMode === 'working' ? (selectedWorkingFile ?? undefined) : undefined,
    Boolean(diffMode === 'working' && selectedWorkingFile)
  )
  const stagedDiff = useDiffStaged(
    diffMode === 'staged' ? (selectedWorkingFile ?? undefined) : undefined,
    Boolean(diffMode === 'staged' && selectedWorkingFile)
  )
  const commitDiff = useDiffShow(
    diffMode === 'commit' ? selectedCommitHash : null,
    diffMode === 'commit' ? (selectedCommitFile ?? undefined) : undefined,
    Boolean(diffMode === 'commit' && selectedCommitHash && selectedCommitFile)
  )
  const rangeDiff = useDiffCommitRange(
    diffMode === 'commit-range' ? compareCommitRange?.oldestHash ?? null : null,
    diffMode === 'commit-range' ? compareCommitRange?.newestHash ?? null : null,
    Boolean(diffMode === 'commit-range' && compareCommitRange)
  )

  const active = (workingDiff.data ?? stagedDiff.data ?? commitDiff.data ?? rangeDiff.data) as
    | GitDiffResult
    | undefined
  const path =
    diffMode === 'commit-range'
      ? compareCommitRange?.label
      : selectedWorkingFile ?? selectedCommitFile ?? selectedStashFile
  const rows = useMemo(
    () => (active?.unified ? parseUnifiedDiffRows(active.unified) : []),
    [active?.unified]
  )
  const loading =
    workingDiff.isLoading || stagedDiff.isLoading || commitDiff.isLoading || rangeDiff.isLoading

  if (!path) return null

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-gf-bg-deep/95">
      <header className="flex items-center justify-between border-b border-gf-border px-4 py-2">
        <p className="truncate text-sm text-gf-fg-muted">{path}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-gf-border-strong px-3 py-1 text-xs text-gf-fg-muted hover:bg-gf-bg"
        >
          Close
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading ? (
          <p className="text-sm text-gf-fg-subtle">Loading diff…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gf-fg-subtle">No changes in this range.</p>
        ) : (
          <UnifiedDiffView rows={rows} loading={loading} />
        )}
      </div>
    </div>
  )
}
