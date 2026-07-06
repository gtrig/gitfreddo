import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { AiActionButton } from '@/components/Ui/AiActionButton'
import { useConflictFileStages } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useMergeStatus } from '@/hooks/useGit'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useToastStore } from '@/stores/toast'
import { parseConflictMarkers } from '@/lib/conflicts/conflictMarkers'
import {
  mapHunksToLineRanges,
  buildOutputFromResolutions,
  buildResolutionFromLineSelection,
  hasUnresolvedMarkers,
  initLineSelections,
  type HunkLineSelection
} from '@/lib/conflicts/threeWayMerge'
import {
  buildPreviewLines,
  initHunkEditModes,
  initResolvedTexts,
  proposalsMapFromList,
  syncCheckboxFromResolvedText,
  type HunkEditMode
} from '@/lib/conflicts/conflictResolution'
import { parseConflictResolveResponse } from '@shared/ai'
import type { AiConflictResolutionProposal } from '@shared/ai'
import { ThreeWayCodePane } from '@/components/DiffViewer/ThreeWayCodePane'
import { ConflictOutputEditor } from '@/components/DiffViewer/ConflictOutputEditor'
import { ConflictAiProposalCard } from '@/components/DiffViewer/ConflictAiProposalCard'
import { Spinner } from '@/components/Ui/Spinner'

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
  const { t } = useTranslation()
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: stages, isLoading, error } = useConflictFileStages(path)
  const { data: mergeStatus } = useMergeStatus()
  const { stageAdd } = useGitMutations()
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const showToast = useToastStore((s) => s.show)
  const pendingAiProposals = useSelectionStore((s) => s.pendingAiProposals[path])
  const clearPendingAiProposals = useSelectionStore((s) => s.clearPendingAiProposals)

  const [markerContent, setMarkerContent] = useState('')
  const [lineSelections, setLineSelections] = useState<Map<number, HunkLineSelection>>(new Map())
  const [resolvedTexts, setResolvedTexts] = useState<Map<number, string>>(new Map())
  const [hunkEditModes, setHunkEditModes] = useState<Map<number, HunkEditMode>>(new Map())
  const [aiProposals, setAiProposals] = useState<Map<number, AiConflictResolutionProposal>>(
    new Map()
  )
  const [activeHunkIndex, setActiveHunkIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)

  const paneOursRef = useRef<HTMLDivElement>(null)
  const paneTheirsRef = useRef<HTMLDivElement>(null)

  const applyProposals = useCallback(
    (proposals: AiConflictResolutionProposal[]) => {
      const proposalMap = proposalsMapFromList(proposals)
      setAiProposals(proposalMap)
      setResolvedTexts((current) => {
        const next = new Map(current)
        for (const proposal of proposals) {
          next.set(proposal.hunkId, proposal.text)
        }
        return next
      })
      setHunkEditModes((current) => {
        const next = new Map(current)
        for (const proposal of proposals) {
          next.set(proposal.hunkId, 'manual')
        }
        return next
      })
      setLineSelections((current) => {
        const next = new Map(current)
        const hunks = parseConflictMarkers(markerContent)
        for (const proposal of proposals) {
          const hunk = hunks.find((item) => item.id === proposal.hunkId)
          if (hunk) {
            next.set(hunk.id, syncCheckboxFromResolvedText(hunk, proposal.text))
          }
        }
        return next
      })
    },
    [markerContent]
  )

  useEffect(() => {
    if (!stages) return
    setMarkerContent(stages.working)
    const hunks = parseConflictMarkers(stages.working)
    const selections = initLineSelections(hunks)
    setLineSelections(selections)
    setResolvedTexts(initResolvedTexts(hunks, selections))
    setHunkEditModes(initHunkEditModes(hunks))
    setActiveHunkIndex(0)
    setAiProposals(new Map())
  }, [stages, path])

  useEffect(() => {
    if (!pendingAiProposals?.length) return
    applyProposals(pendingAiProposals)
  }, [pendingAiProposals, applyProposals])

  const hunks = useMemo(() => parseConflictMarkers(markerContent), [markerContent])
  const output = useMemo(
    () => buildOutputFromResolutions(markerContent, resolvedTexts),
    [markerContent, resolvedTexts]
  )
  const previewLines = useMemo(() => {
    const activeHunk = hunks[activeHunkIndex] ?? null
    return buildPreviewLines(markerContent, hunks, resolvedTexts, activeHunk?.id ?? null)
  }, [markerContent, hunks, resolvedTexts, activeHunkIndex])
  const lineRanges = useMemo(
    () => (stages ? mapHunksToLineRanges(stages.sideA, stages.sideB, hunks) : []),
    [stages, hunks]
  )
  const activeHunk = hunks[activeHunkIndex] ?? null
  const activeRanges = lineRanges[activeHunkIndex] ?? null
  const activeSelection = activeHunk ? lineSelections.get(activeHunk.id) : undefined
  const activeResolvedText = activeHunk ? resolvedTexts.get(activeHunk.id) ?? '' : ''
  const activeEditMode = activeHunk ? hunkEditModes.get(activeHunk.id) ?? 'checkbox' : 'checkbox'
  const activeProposal = activeHunk ? aiProposals.get(activeHunk.id) : undefined

  const oursLabel = mergeStatus?.currentBranch
    ? t('diff.oursWithBranch', { branch: mergeStatus.currentBranch })
    : t('diff.ours')
  const theirsLabel = mergeStatus?.incomingLabel
    ? t('diff.theirsWithBranch', { branch: mergeStatus.incomingLabel })
    : t('diff.theirs')
  const oursSublabel = mergeStatus?.oursCommit
    ? t('diff.commitRef', { hash: mergeStatus.oursCommit })
    : undefined
  const theirsSublabel = mergeStatus?.theirsCommit
    ? t('diff.commitRef', { hash: mergeStatus.theirsCommit })
    : undefined

  function updateActiveResolvedText(text: string) {
    if (!activeHunk) return
    setResolvedTexts((current) => {
      const next = new Map(current)
      next.set(activeHunk.id, text)
      return next
    })
    setHunkEditModes((current) => {
      const next = new Map(current)
      next.set(activeHunk.id, 'manual')
      return next
    })
  }

  function updateActiveSelection(mutate: (current: HunkLineSelection) => HunkLineSelection) {
    if (!activeHunk || !activeSelection) return
    const nextSelection = mutate(activeSelection)
    const nextSelections = new Map(lineSelections)
    nextSelections.set(activeHunk.id, nextSelection)
    setLineSelections(nextSelections)

    if (hunkEditModes.get(activeHunk.id) !== 'manual') {
      const resolved = buildResolutionFromLineSelection(activeHunk, nextSelection)
      setResolvedTexts((current) => {
        const next = new Map(current)
        next.set(activeHunk.id, resolved)
        return next
      })
    }
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

  function setActiveHunkResolvedText(text: string, mode: HunkEditMode = 'manual') {
    if (!activeHunk) return
    setResolvedTexts((current) => {
      const next = new Map(current)
      next.set(activeHunk.id, text)
      return next
    })
    setHunkEditModes((current) => {
      const next = new Map(current)
      next.set(activeHunk.id, mode)
      return next
    })
    if (mode === 'checkbox') {
      setLineSelections((current) => {
        const next = new Map(current)
        next.set(activeHunk.id, syncCheckboxFromResolvedText(activeHunk, text))
        return next
      })
    }
  }

  function handleResetToSelection() {
    if (!activeHunk || !activeSelection) return
    const resolved = buildResolutionFromLineSelection(activeHunk, activeSelection)
    setActiveHunkResolvedText(resolved, 'checkbox')
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
      const proposals = parseConflictResolveResponse(text, hunks.length)
      applyProposals(proposals)
      showToast(
        t('diff.proposalsApplied', { count: proposals.length }),
        'info'
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setAiBusy(false)
    }
  }

  function handleAcceptProposal() {
    if (!activeHunk || !activeProposal) return
    setActiveHunkResolvedText(activeProposal.text, 'manual')
    showToast(t('diff.acceptedProposal', { number: activeHunk.id + 1 }), 'success')
  }

  function handleRejectProposal() {
    if (!activeHunk) return
    setAiProposals((current) => {
      const next = new Map(current)
      next.delete(activeHunk.id)
      return next
    })
  }

  async function handleSave() {
    if (!repoPath) return
    if (hasUnresolvedMarkers(output)) {
      showToast(t('diff.resolveAllBeforeSave'), 'error')
      return
    }
    setSaving(true)
    try {
      await window.gitfreddo.invoke('working.write', { path, content: output }, repoPath)
      await stageAdd.mutateAsync({ paths: [path] })
      clearPendingAiProposals(path)
      showToast(t('diff.conflictResolvedStaged'), 'success')
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
    hunks.length > 0
      ? t('diff.conflictCount', { path, count: hunks.length })
      : path

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gf-bg-deep">
      <header className="flex shrink-0 items-center gap-2 border-b border-gf-border px-3 py-2">
        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-gf-fg">{conflictLabel}</h2>
        {aiEnabled && hunks.length > 0 && (
          <AiActionButton
            variant="detail"
            disabled={aiBusy || isLoading}
            loading={aiBusy}
            onClick={() => void handleAiResolve()}
          >
            {t('diff.autoResolveWithAi')}
          </AiActionButton>
        )}
        <button
          type="button"
          onClick={() => void window.gitfreddo.openInEditor(path)}
          className="rounded border border-gf-border-strong px-2 py-1 text-xs text-gf-fg-muted hover:bg-gf-surface"
        >
          {t('diff.openInEditor')}
        </button>
        <button
          type="button"
          disabled={saving || isLoading}
          onClick={() => void handleSave()}
          className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving && <Spinner size="sm" className="border-white/30 border-t-white" />}
          {t('diff.save')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-gf-fg-subtle hover:bg-gf-surface hover:text-gf-fg"
          aria-label={t('common.close')}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </header>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center text-sm text-gf-fg-subtle">
          {t('diff.loadingConflictStages')}
        </div>
      )}
      {error && (
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-red-400">
          {(error as Error).message}
        </div>
      )}
      {stages && !isLoading && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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

          <div className="flex min-h-0 max-h-[42%] shrink-0 flex-col border-t border-gf-border">
            <div className="flex shrink-0 items-center justify-between border-b border-gf-border px-3 py-1.5">
              <span className="text-[11px] font-semibold uppercase text-gf-fg-subtle">{t('diff.output')}</span>
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
                    {t('diff.conflictOf', {
                      current: hunks.length === 0 ? 0 : activeHunkIndex + 1,
                      total: hunks.length
                    })}
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

            {activeProposal && (
              <div className="shrink-0 border-b border-gf-border px-3 py-2">
                <ConflictAiProposalCard
                  proposal={activeProposal}
                  onAccept={handleAcceptProposal}
                  onReject={handleRejectProposal}
                />
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
              <ConflictOutputEditor
                activeHunk={activeHunk}
                resolvedText={activeResolvedText}
                previewLines={previewLines}
                editMode={activeEditMode}
                onResolvedTextChange={updateActiveResolvedText}
                onTakeOurs={() => activeHunk && setActiveHunkResolvedText(activeHunk.ours, 'checkbox')}
                onTakeTheirs={() =>
                  activeHunk && setActiveHunkResolvedText(activeHunk.theirs, 'checkbox')
                }
                onTakeBoth={() =>
                  activeHunk &&
                  setActiveHunkResolvedText(
                    [activeHunk.ours, activeHunk.theirs].filter(Boolean).join('\n'),
                    'checkbox'
                  )
                }
                onResetToSelection={handleResetToSelection}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
