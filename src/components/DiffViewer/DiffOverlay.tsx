import { useMemo } from 'react'
import { useSelectionStore } from '@/stores/selection'
import { useDiffWorking, useDiffStaged } from '@/hooks/useGit'
import { UnifiedDiffView } from '@/components/DiffViewer/UnifiedDiffView'
import { parseUnifiedDiffRows } from '@/lib/unifiedDiff'
import type { GitDiffResult } from '@/lib/types'

interface DiffOverlayProps {
  onClose: () => void
}

export function DiffOverlay({ onClose }: DiffOverlayProps) {
  const selectedWorkingFile = useSelectionStore((s) => s.selectedWorkingFile)
  const diffMode = useSelectionStore((s) => s.diffMode)
  const selectedStashFile = useSelectionStore((s) => s.selectedStashFile)

  const workingDiff = useDiffWorking(
    diffMode === 'working' ? selectedWorkingFile ?? undefined : undefined,
    Boolean(diffMode === 'working' && selectedWorkingFile)
  )
  const stagedDiff = useDiffStaged(
    diffMode === 'staged' ? selectedWorkingFile ?? undefined : undefined,
    Boolean(diffMode === 'staged' && selectedWorkingFile)
  )

  const active = workingDiff.data ?? stagedDiff.data
  const diff = active as GitDiffResult | undefined
  const path = selectedWorkingFile ?? selectedStashFile
  const rows = useMemo(
    () => (diff?.unified ? parseUnifiedDiffRows(diff.unified) : []),
    [diff?.unified]
  )

  if (!path) return null

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-zinc-950/95">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <p className="truncate text-sm text-zinc-300">{path}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
        >
          Close
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {workingDiff.isLoading || stagedDiff.isLoading ? (
          <p className="text-sm text-zinc-500">Loading diff…</p>
        ) : (
          <UnifiedDiffView rows={rows} loading={workingDiff.isLoading || stagedDiff.isLoading} />
        )}
      </div>
    </div>
  )
}
