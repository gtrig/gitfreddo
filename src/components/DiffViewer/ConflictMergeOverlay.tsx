import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExclamationTriangleIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useConflictFileStages } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useMergeStatus } from '@/hooks/useGit'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { parseConflictMarkers } from '@/lib/conflictMarkers'
import {
  mapHunksToLineRanges,
  buildOutputLinesWithSources,
  outputTextFromLines,
  hasUnresolvedMarkers,
  initLineSelections,
  lineSelectionFromResolution,
  type HunkLineSelection
} from '@/lib/threeWayMerge'
import { parseConflictResolveResponse } from '../../../shared/ai'
import { ThreeWayCodePane } from '@/components/DiffViewer/ThreeWayCodePane'
import { ConflictOutputPane } from '@/components/DiffViewer/ConflictOutputPane'
import { Spinner } from '@/components/ui/Spinner'

interface ConflictMergeOverlayProps {
  path: string
  onClose: () => void
}

function checkedOursLineNumbers(
  rangeStart: number,
  selection: HunkLineSelection
): Set<number> {
  const checked = new Set<number>()
  selection.ours.forEach((on, index) => {
    if (on) checked.add(rangeStart + index)
  })
  return checked
}

function checkedTheirsLineNumbers(
  rangeStart: number,
  selection: HunkLineSelection
): Set<number> {
  const checked = new Set<number>()
  selection.theirs.forEach((on, index) => {
    if (on) checked.add(rangeStart + index)
  })
  return checked
}

export function ConflictMergeOverlay({ path, onClose }: ConflictMergeOverlayProps) {
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: stages, isLoading, error } = useConflictFileStages(path)
  const { data: mergeStatus } = useMergeStatus()
  const { stageAdd } = useGitMutations()
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const showToast = useToastStore((s) => s.show)

  const [markerContent, setMarkerContent] = useState('')
  const [lineSelections, setLineSelections] = useState<Map<number, HunkLineSelection>>(new Map())
  const [activeHunkIndex, setActiveHunkIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)

  const paneOursRef = useRef<HTMLDivElement>(null)
  const paneTheirsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!stages) return
    setMarkerContent(stages.working)
    const hunks = parseConflictMarkers(stages.working)
    const selections = initLineSelections(hunks)
    setLineSelections(selections)
    setActiveHunkIndex(0)
  }, [stages, path])

  const hunks = useMemo(() => parseConflictMarkers(markerContent), [markerContent])
  const outputLines = useMemo(
    () => buildOutputLinesWithSources(markerContent, hunks, lineSelections),
    [markerContent, hunks, lineSelections]
  )
  const output = useMemo(() => outputTextFromLines(outputLines), [outputLines])
  const lineRanges = useMemo(
    () => (stages ? mapHunksToLineRanges(stages.sideA, stages.sideB, hunks) : []),
    [stages, hunks]
  )
  const activeHunk = hunks[activeHunkIndex] ?? null
  const activeRanges = lineRanges[activeHunkIndex] ?? null
  const activeSelection = activeHunk ? lineSelections.get(activeHunk.id) : undefined

  const oursLabel = mergeStatus?.currentBranch
    ? `Ours — ${mergeStatus.currentBranch}`
    : 'Ours'
  const theirsLabel = mergeStatus?.incomingLabel
    ? `Theirs — ${mergeStatus.incomingLabel}`
    : 'Theirs'
  const oursSublabel = mergeStatus?.oursCommit ? `Commit ${mergeStatus.oursCommit}` : undefined
  const theirsSublabel = mergeStatus?.theirsCommit ? `Commit ${mergeStatus.theirsCommit}` : undefined

  const applyLineSelections = useCallback((next: Map<number, HunkLineSelection>) => {
    setLineSelections(next)
  }, [])

  function updateActiveSelection(mutate: (current: HunkLineSelection) => HunkLineSelection) {
    if (!activeHunk || !activeSelection) return
    const next = new Map(lineSelections)
    next.set(activeHunk.id, mutate(activeSelection))
    applyLineSelections(next)
  }

  function toggleOursLine(lineNo: number) {
    if (!activeRanges?.sideA || !activeSelection) return
    const index = lineNo - activeRanges.sideA.start
    if (index < 0 || index >= activeSelection.ours.length) return
    updateActiveSelection((current) => {
      const ours = [...current.ours]
      ours[index] = !ours[index]
      return { ...current, ours }
    })
  }

  function toggleTheirsLine(lineNo: number) {
    if (!activeRanges?.sideB || !activeSelection) return
    const index = lineNo - activeRanges.sideB.start
    if (index < 0 || index >= activeSelection.theirs.length) return
    updateActiveSelection((current) => {
      const theirs = [...current.theirs]
      theirs[index] = !theirs[index]
      return { ...current, theirs }
    })
  }

  function selectAllOurs(select: boolean) {
    if (!activeHunk || !activeSelection) return
    updateActiveSelection((current) => ({
      ...current,
      ours: current.ours.map(() => select)
    }))
  }

  function selectAllTheirs(select: boolean) {
    if (!activeHunk || !activeSelection) return
    updateActiveSelection((current) => ({
      ...current,
      theirs: current.theirs.map(() => select)
    }))
  }

  async function handleAiResolve() {
    if (!stages) return
    setAiBusy(true)
    try {
      const text = await aiFill.mutateAsync({
        purpose: 'resolve_conflict',
        context: {
          filePath: path,
          sideA: stages.sideA,
          sideB: stages.sideB,
          sideBase: stages.base,
          conflictContent: stages.working,
          operationKind: mergeStatus?.kind ?? undefined,
          incomingLabel: mergeStatus?.incomingLabel,
          branch: mergeStatus?.currentBranch
        }
      })
      const parsed = parseConflictResolveResponse(text, hunks.length)
      const nextSelections = new Map(lineSelections)
      for (const hunk of hunks) {
        const resolution = parsed.get(hunk.id) ?? ''
        nextSelections.set(hunk.id, lineSelectionFromResolution(hunk, resolution))
      }
      applyLineSelections(nextSelections)
      showToast('AI suggested resolutions applied. Review output before saving.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setAiBusy(false)
    }
  }

  async function handleSave() {
    if (!repoPath) return
    if (hasUnresolvedMarkers(output)) {
      showToast('Resolve all conflicts before saving.', 'error')
      return
    }
    setSaving(true)
    try {
      await window.gitfreddo.invoke('working.write', { path, content: output }, repoPath)
      await stageAdd.mutateAsync({ paths: [path] })
      showToast('Conflict resolved and staged.', 'success')
      onClose()
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const oursCheckedLines =
    activeRanges?.sideA && activeSelection
      ? checkedOursLineNumbers(activeRanges.sideA.start, activeSelection)
      : new Set<number>()
  const theirsCheckedLines =
    activeRanges?.sideB && activeSelection
      ? checkedTheirsLineNumbers(activeRanges.sideB.start, activeSelection)
      : new Set<number>()
  const allOursSelected = activeSelection?.ours.every(Boolean) ?? false
  const allTheirsSelected = activeSelection?.theirs.every(Boolean) ?? false

  const conflictLabel =
    hunks.length > 0 ? `${path} (${hunks.length} conflict${hunks.length === 1 ? '' : 's'})` : path

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-gf-bg-deep">
      <header className="flex shrink-0 items-center gap-2 border-b border-gf-border px-3 py-2">
        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-gf-fg">{conflictLabel}</h2>
        {aiEnabled && hunks.length > 0 && (
          <button
            type="button"
            disabled={aiBusy || isLoading}
            onClick={() => void handleAiResolve()}
            className="inline-flex items-center gap-1.5 rounded bg-violet-600/80 px-2.5 py-1 text-xs text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {aiBusy ? <Spinner size="sm" className="border-white/30 border-t-white" /> : (
              <SparklesIcon className="h-3.5 w-3.5" aria-hidden />
            )}
            Auto-resolve with AI
          </button>
        )}
        <button
          type="button"
          onClick={() => void window.gitfreddo.openInEditor(path)}
          className="rounded border border-gf-border-strong px-2 py-1 text-xs text-gf-fg-muted hover:bg-gf-surface"
        >
          Open in editor
        </button>
        <button
          type="button"
          disabled={saving || isLoading}
          onClick={() => void handleSave()}
          className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving && <Spinner size="sm" className="border-white/30 border-t-white" />}
          Save
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-gf-fg-subtle hover:bg-gf-surface hover:text-gf-fg"
          aria-label="Close"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </header>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center text-sm text-gf-fg-subtle">
          Loading conflict stages…
        </div>
      )}
      {error && (
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-red-400">
          {(error as Error).message}
        </div>
      )}
      {stages && !isLoading && (
        <>
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-px bg-gf-border">
            <ThreeWayCodePane
              label={oursLabel}
              sublabel={oursSublabel}
              content={stages.sideA}
              highlightRange={activeRanges?.sideA}
              highlightClass="bg-sky-500/25"
              headerClass="bg-sky-500/15 text-sky-200"
              checkedLines={oursCheckedLines}
              onLineToggle={toggleOursLine}
              onSelectAll={() => selectAllOurs(!allOursSelected)}
              allSelected={allOursSelected}
              scrollRef={paneOursRef}
            />
            <ThreeWayCodePane
              label={theirsLabel}
              sublabel={theirsSublabel}
              content={stages.sideB}
              highlightRange={activeRanges?.sideB}
              highlightClass="bg-amber-500/25"
              headerClass="bg-amber-500/15 text-amber-100"
              checkedLines={theirsCheckedLines}
              onLineToggle={toggleTheirsLine}
              onSelectAll={() => selectAllTheirs(!allTheirsSelected)}
              allSelected={allTheirsSelected}
              scrollRef={paneTheirsRef}
            />
          </div>

          <div className="flex min-h-[28%] max-h-[40%] shrink-0 flex-col border-t border-gf-border">
            <div className="flex shrink-0 items-center justify-between border-b border-gf-border px-3 py-1.5">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase text-gf-fg-subtle">Output</span>
                <span className="inline-flex items-center gap-2 text-[10px] text-gf-fg-subtle">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-sky-500/50" />
                    Ours
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-amber-500/50" />
                    Theirs
                  </span>
                </span>
              </div>
              {hunks.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gf-fg-muted">
                  <button
                    type="button"
                    disabled={activeHunkIndex <= 0}
                    onClick={() => setActiveHunkIndex((i) => Math.max(0, i - 1))}
                    className="rounded px-1.5 py-0.5 hover:bg-gf-surface disabled:opacity-40"
                  >
                    ▲
                  </button>
                  <span>
                    conflict {hunks.length === 0 ? 0 : activeHunkIndex + 1} of {hunks.length}
                  </span>
                  <button
                    type="button"
                    disabled={activeHunkIndex >= hunks.length - 1}
                    onClick={() => setActiveHunkIndex((i) => Math.min(hunks.length - 1, i + 1))}
                    className="rounded px-1.5 py-0.5 hover:bg-gf-surface disabled:opacity-40"
                  >
                    ▼
                  </button>
                </div>
              )}
            </div>
            <ConflictOutputPane lines={outputLines} />
          </div>
        </>
      )}
    </div>
  )
}
