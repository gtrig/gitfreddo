import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  useDiffCommitRange,
  useDiffShow,
  useDiffStaged,
  useDiffWorking,
  useStashDiff
} from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useAppSettings } from '@/hooks/useAppSettings'
import { useToastStore } from '@/stores/toast'
import { UnifiedDiffView } from '@/components/DiffViewer/UnifiedDiffView'
import { SplitDiffView } from '@/components/DiffViewer/SplitDiffView'
import {
  buildHunkPatch,
  groupRowsByHunk,
  parseUnifiedDiffRows,
  splitRowsForDisplay
} from '@/lib/unifiedDiff'
import type { AppSettings } from '@/hooks/useAppSettings'
import type { GitBlameLine, GitDiffResult } from '@/lib/types'

interface DiffOverlayProps {
  onClose: () => void
}

type DiffViewMode = AppSettings['diffViewMode'] | 'blame'

export function DiffOverlay({ onClose }: DiffOverlayProps) {
  const { t } = useTranslation()
  const { data: settings } = useAppSettings()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const showToast = useToastStore((s) => s.show)
  const { stageApplyPatch } = useGitMutations()
  const [viewMode, setViewMode] = useState<DiffViewMode>(settings?.diffViewMode ?? 'unified')

  const selectedWorkingFile = useSelectionStore((s) => s.selectedWorkingFile)
  const selectedCommitFile = useSelectionStore((s) => s.selectedCommitFile)
  const selectedCommitHash = useSelectionStore((s) => s.selectedCommitHash)
  const diffMode = useSelectionStore((s) => s.diffMode)
  const selectedStashFile = useSelectionStore((s) => s.selectedStashFile)
  const selectedStashIndex = useSelectionStore((s) => s.selectedStashIndex)
  const compareCommitRange = useSelectionStore((s) => s.compareCommitRange)

  const wordDiff = viewMode === 'word'
  const showBlame = viewMode === 'blame'

  const workingDiff = useDiffWorking(
    diffMode === 'working' ? (selectedWorkingFile ?? undefined) : undefined,
    Boolean(diffMode === 'working' && selectedWorkingFile),
    wordDiff
  )
  const stagedDiff = useDiffStaged(
    diffMode === 'staged' ? (selectedWorkingFile ?? undefined) : undefined,
    Boolean(diffMode === 'staged' && selectedWorkingFile),
    wordDiff
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
  const stashDiff = useStashDiff(
    diffMode === 'stash' ? selectedStashIndex : null,
    selectedStashFile ?? undefined,
    Boolean(diffMode === 'stash' && selectedStashIndex !== null)
  )

  const active = useMemo((): GitDiffResult | undefined => {
    switch (diffMode) {
      case 'working':
        return workingDiff.data
      case 'staged':
        return stagedDiff.data
      case 'commit':
        return commitDiff.data
      case 'commit-range':
        return rangeDiff.data
      case 'stash':
        return stashDiff.data
      default:
        return undefined
    }
  }, [
    diffMode,
    workingDiff.data,
    stagedDiff.data,
    commitDiff.data,
    rangeDiff.data,
    stashDiff.data
  ])

  const filePath =
    diffMode === 'commit'
      ? selectedCommitFile
      : diffMode === 'working' || diffMode === 'staged'
        ? selectedWorkingFile
        : active?.path

  const blameRef =
    diffMode === 'commit' ? selectedCommitHash : diffMode === 'stash' ? null : undefined

  const blameQuery = useQuery({
    queryKey: ['repo', repoPath, 'file.blame', filePath, blameRef],
    queryFn: async () =>
      (await window.gitfreddo.invoke('file.blame', {
        path: filePath!,
        ...(blameRef ? { ref: blameRef } : {})
      })) as GitBlameLine[],
    enabled:
      showBlame &&
      connected &&
      Boolean(repoPath) &&
      Boolean(filePath) &&
      diffMode !== 'commit-range' &&
      diffMode !== 'stash'
  })

  const path =
    diffMode === 'commit-range'
      ? compareCommitRange?.label
      : diffMode === 'stash'
        ? selectedStashFile ?? `stash@{${selectedStashIndex}}`
        : selectedWorkingFile ?? selectedCommitFile ?? selectedStashFile

  const rows = useMemo(
    () => (active?.unified ? parseUnifiedDiffRows(active.unified) : []),
    [active?.unified]
  )
  const hunkGroups = useMemo(() => groupRowsByHunk(rows), [rows])
  const splitRows = useMemo(() => splitRowsForDisplay(rows), [rows])

  const blameByNewLine = useMemo(() => {
    const map = new Map<number, GitBlameLine>()
    for (const line of blameQuery.data ?? []) {
      map.set(line.line, line)
    }
    return map
  }, [blameQuery.data])

  const loading = useMemo(() => {
    switch (diffMode) {
      case 'working':
        return workingDiff.isLoading
      case 'staged':
        return stagedDiff.isLoading
      case 'commit':
        return commitDiff.isLoading
      case 'commit-range':
        return rangeDiff.isLoading
      case 'stash':
        return stashDiff.isLoading
      default:
        return false
    }
  }, [
    diffMode,
    workingDiff.isLoading,
    stagedDiff.isLoading,
    commitDiff.isLoading,
    rangeDiff.isLoading,
    stashDiff.isLoading
  ])

  const canBlame =
    Boolean(filePath) && diffMode !== 'commit-range' && diffMode !== 'stash'
  const hunkStageMode =
    diffMode === 'working' ? 'stage' : diffMode === 'staged' ? 'unstage' : null
  const patchPath = active?.path ?? filePath ?? path ?? ''

  async function handleHunkAction(groupIndex: number) {
    if (!hunkStageMode || !patchPath) return
    const group = hunkGroups[groupIndex]
    if (!group?.length) return

    const patch = buildHunkPatch(patchPath, group)
    try {
      await stageApplyPatch.mutateAsync({
        patch,
        reverse: hunkStageMode === 'unstage'
      })
      showToast(hunkStageMode === 'stage' ? t('diff.hunkStaged') : t('diff.hunkUnstaged'), 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  if (!path) return null

  const effectiveMode = viewMode === 'word' || viewMode === 'blame' ? 'unified' : viewMode
  const viewModes: DiffViewMode[] = canBlame
    ? ['unified', 'split', 'word', 'blame']
    : ['unified', 'split', 'word']

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-gf-bg-deep/95">
      <header className="flex items-center justify-between gap-2 border-b border-gf-border px-4 py-2">
        <p className="min-w-0 truncate text-sm text-gf-fg-muted">{path}</p>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex rounded border border-gf-border-strong text-[10px]">
            {viewModes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-2 py-0.5 capitalize ${
                  viewMode === mode
                    ? 'bg-gf-surface text-gf-fg'
                    : 'text-gf-fg-muted hover:bg-gf-bg'
                }`}
              >
                {mode === 'split' ? t('diff.sideBySide') : mode}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gf-border-strong px-3 py-1 text-xs text-gf-fg-muted hover:bg-gf-bg"
          >
            {t('common.close')}
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading || (showBlame && blameQuery.isLoading) ? (
          <p className="text-sm text-gf-fg-subtle">{t('diff.loadingDiff')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gf-fg-subtle">{t('diff.noChangesInRange')}</p>
        ) : effectiveMode === 'split' ? (
          <SplitDiffView rows={splitRows} loading={loading} />
        ) : (
          <UnifiedDiffView
            rows={rows}
            loading={loading}
            showBlame={showBlame}
            blameByNewLine={blameByNewLine}
            hunkStageMode={hunkStageMode}
            onHunkAction={(groupIndex) => void handleHunkAction(groupIndex)}
            hunkBusy={stageApplyPatch.isPending}
          />
        )}
      </div>
    </div>
  )
}
