import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { AiActionButton } from '@/components/Ui/AiActionButton'
import { useMergeStatus, useWorkingStatus } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useToastStore } from '@/stores/toast'
import { useInvalidateGit } from '@/hooks/useInvalidateGit'
import { buildFileTree, type FileTreeNode } from '@/lib/workspace/fileTree'
import { FILE_ROW_HEIGHT, VIRTUAL_OVERSCAN, shouldVirtualize } from '@/lib/ui/virtualList'
import { parseConflictMarkers } from '@/lib/conflicts/conflictMarkers'
import { hasUnresolvedMarkers } from '@/lib/conflicts/threeWayMerge'
import { averageConfidence, parseConflictResolveResponse } from '@shared/ai'
import type { GitMergeStatus } from '@/lib/types'
import { confidenceBadgeClass } from '@/components/DiffViewer/ConflictAiProposalCard'
import { LoadingRow } from '@/components/Ui/Spinner'
import { MergeCommitFooter } from '@/components/MergeConflicts/MergeCommitFooter'
import { SidebarIconChevron } from '@/components/Layout/sidebar/SidebarIcons'

function operationTitle(
  status: GitMergeStatus,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (status.kind === 'merge') {
    const incoming = status.incomingLabel ?? 'branch'
    const current = status.currentBranch ?? 'HEAD'
    return t('conflicts.mergingInto', { incoming, current })
  }
  if (status.kind === 'rebase') return t('conflicts.rebaseInProgress')
  if (status.kind === 'cherry-pick') return t('conflicts.cherryPickInProgress')
  return t('conflicts.mergeOperationInProgress')
}

function Chevron({ open }: { open: boolean }) {
  return <SidebarIconChevron open={open} className="h-3 w-3 shrink-0 text-gf-fg-subtle" />
}

function ConflictFileRow({
  path,
  selected,
  proposalSummary,
  onSelect,
  aiProposalsTitle
}: {
  path: string
  selected: boolean
  proposalSummary?: { count: number; avgConfidence: number }
  onSelect: () => void
  aiProposalsTitle: (count: number) => string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-gf-surface-hover ${
        selected ? 'bg-gf-surface text-white' : 'text-gf-fg-muted'
      }`}
    >
      <span className="inline-block w-3 text-center font-mono text-[11px] text-orange-400">U</span>
      <span className="min-w-0 flex-1 truncate font-mono">{path}</span>
      {proposalSummary && (
        <span
          className={`shrink-0 rounded border px-1 py-0.5 text-[9px] font-semibold ${confidenceBadgeClass(proposalSummary.avgConfidence)}`}
          title={aiProposalsTitle(proposalSummary.count)}
        >
          {proposalSummary.avgConfidence}%
        </span>
      )}
    </button>
  )
}

function TreeFolder({
  node,
  depth,
  expandedPaths,
  toggleExpanded,
  selectedFile,
  onSelectFile,
  conflictedSet,
  pendingAiProposals,
  aiProposalsTitle
}: {
  node: FileTreeNode
  depth: number
  expandedPaths: Set<string>
  toggleExpanded: (path: string) => void
  selectedFile: string | null
  onSelectFile: (path: string) => void
  conflictedSet: Set<string>
  pendingAiProposals: Record<string, { count: number; avgConfidence: number }>
  aiProposalsTitle: (count: number) => string
}) {
  if (node.type === 'folder') {
    const open = expandedPaths.has(node.path)
    return (
      <div>
        <button
          type="button"
          onClick={() => toggleExpanded(node.path)}
          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs text-gf-fg-muted hover:bg-gf-surface-hover"
          style={{ paddingLeft: depth * 12 + 4 }}
        >
          <Chevron open={open} />
          <span className="font-mono">{node.name}/</span>
        </button>
        {open &&
          node.children.map((child) => (
            <TreeFolder
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              toggleExpanded={toggleExpanded}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              conflictedSet={conflictedSet}
              pendingAiProposals={pendingAiProposals}
              aiProposalsTitle={aiProposalsTitle}
            />
          ))}
      </div>
    )
  }

  if (!conflictedSet.has(node.path)) return null

  return (
    <div style={{ paddingLeft: depth * 12 + 16 }}>
      <ConflictFileRow
        path={node.path}
        selected={selectedFile === node.path}
        proposalSummary={pendingAiProposals[node.path]}
        onSelect={() => onSelectFile(node.path)}
        aiProposalsTitle={aiProposalsTitle}
      />
    </div>
  )
}

export function MergeConflictsPanel() {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: mergeStatus, isLoading: mergeLoading } = useMergeStatus(connected)
  const { data: workingStatus } = useWorkingStatus(connected)
  const selectedFile = useSelectionStore((s) => s.selectedConflictFile)
  const setSelectedConflictFile = useSelectionStore((s) => s.setSelectedConflictFile)
  const pendingAiProposals = useSelectionStore((s) => s.pendingAiProposals)
  const setPendingAiProposals = useSelectionStore((s) => s.setPendingAiProposals)
  const { stageAdd } = useGitMutations()
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const showToast = useToastStore((s) => s.show)
  const invalidate = useInvalidateGit()

  const [viewMode, setViewMode] = useState<'path' | 'tree'>('tree')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [aiBulkBusy, setAiBulkBusy] = useState(false)
  const conflictedScrollRef = useRef<HTMLDivElement>(null)
  const resolvedScrollRef = useRef<HTMLDivElement>(null)

  const conflictedPaths = mergeStatus?.conflictedPaths ?? []
  const conflictedSet = useMemo(() => new Set(conflictedPaths), [conflictedPaths])

  const proposalSummaries = useMemo(() => {
    const summaries: Record<string, { count: number; avgConfidence: number }> = {}
    for (const [path, proposals] of Object.entries(pendingAiProposals)) {
      summaries[path] = {
        count: proposals.length,
        avgConfidence: averageConfidence(proposals)
      }
    }
    return summaries
  }, [pendingAiProposals])

  const resolvedPaths = useMemo(() => {
    if (!workingStatus || !mergeStatus?.inProgress) return []
    return workingStatus.staged
      .map((f) => f.path)
      .filter((path) => !conflictedSet.has(path))
  }, [workingStatus, mergeStatus?.inProgress, conflictedSet])

  const conflictedTree = useMemo(
    () =>
      buildFileTree(
        conflictedPaths.map((path) => ({ path, kind: 'changed' as const }))
      ),
    [conflictedPaths]
  )

  const conflictedVirtualizer = useVirtualizer({
    count: viewMode === 'path' && shouldVirtualize(conflictedPaths.length) ? conflictedPaths.length : 0,
    getScrollElement: () => conflictedScrollRef.current,
    estimateSize: () => FILE_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  const resolvedVirtualizer = useVirtualizer({
    count: viewMode === 'path' && shouldVirtualize(resolvedPaths.length) ? resolvedPaths.length : 0,
    getScrollElement: () => resolvedScrollRef.current,
    estimateSize: () => FILE_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  const resolvedTree = useMemo(
    () =>
      buildFileTree(
        resolvedPaths.map((path) => ({ path, kind: 'changed' as const }))
      ),
    [resolvedPaths]
  )

  async function verifyNoMarkers(paths: string[]): Promise<boolean> {
    if (!repoPath) return false
    for (const path of paths) {
      const { content } = (await window.gitfreddo.invoke('working.read', { path }, repoPath)) as {
        content: string
      }
      if (parseConflictMarkers(content).length > 0 || hasUnresolvedMarkers(content)) {
        return false
      }
    }
    return true
  }

  async function handleMarkAllResolved() {
    if (conflictedPaths.length === 0) return
    setBulkBusy(true)
    try {
      const ok = await verifyNoMarkers(conflictedPaths)
      if (!ok) {
        showToast(t('conflicts.someFilesStillHaveMarkers'), 'error')
        return
      }
      await stageAdd.mutateAsync({ paths: conflictedPaths })
      showToast(t('conflicts.allConflictedStaged'), 'success')
      invalidate()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setBulkBusy(false)
    }
  }

  async function resolveFileWithAi(path: string): Promise<void> {
    if (!repoPath) return
    const text = await aiFill.mutateAsync({
      purpose: 'resolve_conflict',
      context: {
        filePath: path,
        operationKind: mergeStatus?.kind ?? undefined,
        incomingLabel: mergeStatus?.incomingLabel,
        branch: mergeStatus?.currentBranch
      }
    })
    const { content: working } = (await window.gitfreddo.invoke('working.read', { path }, repoPath)) as {
      content: string
    }
    const hunks = parseConflictMarkers(working)
    const proposals = parseConflictResolveResponse(text, hunks.length)
    setPendingAiProposals(path, proposals)
  }

  async function handleAiResolveAll() {
    if (conflictedPaths.length === 0) return
    setAiBulkBusy(true)
    try {
      for (let i = 0; i < conflictedPaths.length; i++) {
        const path = conflictedPaths[i]!
        showToast(
          t('conflicts.analyzingFile', {
            current: i + 1,
            total: conflictedPaths.length,
            path
          }),
          'info'
        )
        await resolveFileWithAi(path)
      }
      const firstPath = conflictedPaths[0]
      if (firstPath) {
        setSelectedConflictFile(firstPath)
      }
      showToast(t('conflicts.aiProposalsReadyReview'), 'info')
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setAiBulkBusy(false)
    }
  }

  if (!connected) {
    return <p className="p-4 text-sm text-gf-fg-subtle">{t('conflicts.openRepoPrompt')}</p>
  }

  if (mergeLoading) return <div className="p-4"><LoadingRow /></div>

  if (!mergeStatus?.inProgress) {
    return (
      <p className="p-4 text-sm text-gf-fg-subtle">{t('conflicts.noMergeInProgress')}</p>
    )
  }

  const busy = bulkBusy || aiBulkBusy || stageAdd.isPending
  const proposalFileCount = Object.keys(proposalSummaries).length

  return (
    <div className="flex h-full min-h-0 flex-col bg-gf-bg-deep">
      <div className="shrink-0 border-b border-gf-border px-3 py-3">
        <div className="flex items-start gap-2">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-orange-300">{t('conflicts.mergeConflictsDetected')}</p>
            <p className="mt-0.5 text-[11px] text-gf-fg-muted">{operationTitle(mergeStatus, t)}</p>
            {proposalFileCount > 0 && (
              <p className="mt-1 text-[10px] text-violet-300">
                {t('conflicts.aiProposalsReady', { count: proposalFileCount })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'path' ? 'tree' : 'path'))}
            className="shrink-0 rounded border border-gf-border-strong px-2 py-0.5 text-[10px] text-gf-fg-subtle hover:bg-gf-surface"
          >
            {viewMode === 'path' ? t('conflicts.path') : t('conflicts.tree')}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold text-gf-fg-subtle">
              {t('conflicts.conflictedFiles', { count: conflictedPaths.length })}
            </h3>
            <div className="flex flex-wrap gap-1">
              {aiEnabled && conflictedPaths.length > 0 && (
                <AiActionButton
                  variant="pill"
                  disabled={busy}
                  loading={aiBulkBusy}
                  onClick={() => void handleAiResolveAll()}
                >
                  {t('conflicts.autoResolveAllWithAi')}
                </AiActionButton>
              )}
              {conflictedPaths.length > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleMarkAllResolved()}
                  className="rounded border border-orange-500/40 px-2 py-0.5 text-[10px] text-orange-300 hover:bg-orange-500/10 disabled:opacity-50"
                >
                  {t('conflicts.markAllResolved')}
                </button>
              )}
            </div>
          </div>
          {conflictedPaths.length === 0 ? (
            <p className="text-xs text-gf-fg-subtle">—</p>
          ) : viewMode === 'path' ? (
            conflictedVirtualizer.options.count > 0 ? (
              <div
                ref={conflictedScrollRef}
                className="overflow-y-auto"
                style={{ maxHeight: '40vh' }}
              >
                <div style={{ height: conflictedVirtualizer.getTotalSize(), position: 'relative' }}>
                  {conflictedVirtualizer.getVirtualItems().map((virtualItem) => {
                    const path = conflictedPaths[virtualItem.index]!
                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute', top: 0, left: 0, width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`
                        }}
                      >
                        <ConflictFileRow
                          path={path}
                          selected={selectedFile === path}
                          proposalSummary={proposalSummaries[path]}
                          onSelect={() => setSelectedConflictFile(path)}
                          aiProposalsTitle={(count) => t('conflicts.aiProposalsTitle', { count })}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {conflictedPaths.map((path) => (
                  <ConflictFileRow
                    key={path}
                    path={path}
                    selected={selectedFile === path}
                    proposalSummary={proposalSummaries[path]}
                    onSelect={() => setSelectedConflictFile(path)}
                    aiProposalsTitle={(count) => t('conflicts.aiProposalsTitle', { count })}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="space-y-0.5">
              {conflictedTree.children.map((node) => (
                <TreeFolder
                  key={node.path}
                  node={node}
                  depth={0}
                  expandedPaths={expandedPaths}
                  toggleExpanded={(p) =>
                    setExpandedPaths((current) => {
                      const next = new Set(current)
                      if (next.has(p)) next.delete(p)
                      else next.add(p)
                      return next
                    })
                  }
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedConflictFile}
                  conflictedSet={conflictedSet}
                  pendingAiProposals={proposalSummaries}
                  aiProposalsTitle={(count) => t('conflicts.aiProposalsTitle', { count })}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mb-3">
          <h3 className="mb-1 text-[11px] font-semibold text-gf-fg-subtle">
            {t('conflicts.resolvedFiles', { count: resolvedPaths.length })}
          </h3>
          {resolvedPaths.length === 0 ? (
            <p className="text-xs text-gf-fg-subtle">—</p>
          ) : viewMode === 'path' ? (
            resolvedVirtualizer.options.count > 0 ? (
              <div
                ref={resolvedScrollRef}
                className="overflow-y-auto"
                style={{ maxHeight: '40vh' }}
              >
                <div style={{ height: resolvedVirtualizer.getTotalSize(), position: 'relative' }}>
                  {resolvedVirtualizer.getVirtualItems().map((virtualItem) => {
                    const path = resolvedPaths[virtualItem.index]!
                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute', top: 0, left: 0, width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`
                        }}
                        className="flex items-center gap-2 rounded px-2 py-1 text-xs text-gf-fg-muted"
                      >
                        <span className="inline-block w-3 text-center font-mono text-[11px] text-emerald-400">✓</span>
                        <span className="truncate font-mono">{path}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {resolvedPaths.map((path) => (
                  <div
                    key={path}
                    className="flex items-center gap-2 rounded px-2 py-1 text-xs text-gf-fg-muted"
                  >
                    <span className="inline-block w-3 text-center font-mono text-[11px] text-emerald-400">
                      ✓
                    </span>
                    <span className="truncate font-mono">{path}</span>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-0.5">
              {resolvedTree.children.map((node) => (
                <div key={node.path} className="text-xs font-mono text-gf-fg-muted">
                  {node.path}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MergeCommitFooter
        mergeStatus={mergeStatus}
        conflictedCount={conflictedPaths.length}
      />
    </div>
  )
}
