import { useMemo, useState } from 'react'
import { ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useMergeStatus, useWorkingStatus } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useAiFill } from '@/hooks/useAiFill'
import { useToastStore } from '@/stores/toast'
import { useInvalidateGit } from '@/hooks/useInvalidateGit'
import { buildFileTree, type FileTreeNode } from '@/lib/fileTree'
import { parseConflictMarkers, applyConflictResolutions } from '@/lib/conflictMarkers'
import { hasUnresolvedMarkers } from '@/lib/threeWayMerge'
import { parseConflictResolveResponse } from '../../../shared/ai'
import type { GitMergeStatus } from '@/lib/types'
import { LoadingRow, Spinner } from '@/components/ui/Spinner'
import { MergeCommitFooter } from '@/components/MergeConflicts/MergeCommitFooter'
import { SidebarIconChevron } from '@/components/layout/sidebar/SidebarIcons'

function operationTitle(status: GitMergeStatus): string {
  if (status.kind === 'merge') {
    const incoming = status.incomingLabel ?? 'branch'
    const current = status.currentBranch ?? 'HEAD'
    return `Merging ${incoming} into ${current}`
  }
  if (status.kind === 'rebase') return 'Rebase in progress'
  if (status.kind === 'cherry-pick') return 'Cherry-pick in progress'
  return 'Merge operation in progress'
}

function Chevron({ open }: { open: boolean }) {
  return <SidebarIconChevron open={open} className="h-3 w-3 shrink-0 text-gf-fg-subtle" />
}

function ConflictFileRow({
  path,
  selected,
  onSelect
}: {
  path: string
  selected: boolean
  onSelect: () => void
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
      <span className="truncate font-mono">{path}</span>
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
  conflictedSet
}: {
  node: FileTreeNode
  depth: number
  expandedPaths: Set<string>
  toggleExpanded: (path: string) => void
  selectedFile: string | null
  onSelectFile: (path: string) => void
  conflictedSet: Set<string>
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
        onSelect={() => onSelectFile(node.path)}
      />
    </div>
  )
}

export function MergeConflictsPanel() {
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const { data: mergeStatus, isLoading: mergeLoading } = useMergeStatus(connected)
  const { data: workingStatus } = useWorkingStatus(connected)
  const selectedFile = useSelectionStore((s) => s.selectedConflictFile)
  const setSelectedConflictFile = useSelectionStore((s) => s.setSelectedConflictFile)
  const { stageAdd } = useGitMutations()
  const aiEnabled = useAiEnabled()
  const aiFill = useAiFill()
  const showToast = useToastStore((s) => s.show)
  const invalidate = useInvalidateGit()

  const [viewMode, setViewMode] = useState<'path' | 'tree'>('tree')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [aiBulkBusy, setAiBulkBusy] = useState(false)

  const conflictedPaths = mergeStatus?.conflictedPaths ?? []
  const conflictedSet = useMemo(() => new Set(conflictedPaths), [conflictedPaths])

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
      const content = String(await window.gitfreddo.invoke('working.read', { path }, repoPath))
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
        showToast('Some files still contain conflict markers.', 'error')
        return
      }
      await stageAdd.mutateAsync({ paths: conflictedPaths })
      showToast('All conflicted files staged.', 'success')
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
    const working = String(await window.gitfreddo.invoke('working.read', { path }, repoPath))
    const hunks = parseConflictMarkers(working)
    const resolutions = parseConflictResolveResponse(text, hunks.length)
    const resolved = applyConflictResolutions(working, resolutions)
    if (hasUnresolvedMarkers(resolved)) {
      throw new Error(`AI left conflict markers in ${path}`)
    }
    await window.gitfreddo.invoke('working.write', { path, content: resolved }, repoPath)
    await stageAdd.mutateAsync({ paths: [path] })
  }

  async function handleAiResolveAll() {
    if (conflictedPaths.length === 0) return
    setAiBulkBusy(true)
    try {
      for (let i = 0; i < conflictedPaths.length; i++) {
        const path = conflictedPaths[i]!
        showToast(`Resolving ${i + 1} / ${conflictedPaths.length}: ${path}`, 'info')
        await resolveFileWithAi(path)
      }
      showToast('All conflicts auto-resolved and staged.', 'success')
      invalidate()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setAiBulkBusy(false)
    }
  }

  if (!connected) {
    return <p className="p-4 text-sm text-gf-fg-subtle">Open a repository to view merge conflicts.</p>
  }

  if (mergeLoading) return <div className="p-4"><LoadingRow /></div>

  if (!mergeStatus?.inProgress) {
    return (
      <p className="p-4 text-sm text-gf-fg-subtle">No merge operation in progress.</p>
    )
  }

  const busy = bulkBusy || aiBulkBusy || stageAdd.isPending

  return (
    <div className="flex h-full min-h-0 flex-col bg-gf-bg-deep">
      <div className="shrink-0 border-b border-gf-border px-3 py-3">
        <div className="flex items-start gap-2">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-orange-300">Merge conflicts detected</p>
            <p className="mt-0.5 text-[11px] text-gf-fg-muted">{operationTitle(mergeStatus)}</p>
          </div>
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'path' ? 'tree' : 'path'))}
            className="shrink-0 rounded border border-gf-border-strong px-2 py-0.5 text-[10px] text-gf-fg-subtle hover:bg-gf-surface"
          >
            {viewMode === 'path' ? 'Path' : 'Tree'}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold text-gf-fg-subtle">
              Conflicted Files ({conflictedPaths.length})
            </h3>
            <div className="flex flex-wrap gap-1">
              {aiEnabled && conflictedPaths.length > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleAiResolveAll()}
                  className="inline-flex items-center gap-1 rounded border border-violet-500/40 px-2 py-0.5 text-[10px] text-violet-300 hover:bg-violet-500/10 disabled:opacity-50"
                >
                  {aiBulkBusy ? (
                    <Spinner size="sm" />
                  ) : (
                    <SparklesIcon className="h-3 w-3" aria-hidden />
                  )}
                  Auto-resolve all with AI
                </button>
              )}
              {conflictedPaths.length > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleMarkAllResolved()}
                  className="rounded border border-orange-500/40 px-2 py-0.5 text-[10px] text-orange-300 hover:bg-orange-500/10 disabled:opacity-50"
                >
                  Mark all resolved
                </button>
              )}
            </div>
          </div>
          {conflictedPaths.length === 0 ? (
            <p className="text-xs text-gf-fg-subtle">—</p>
          ) : viewMode === 'path' ? (
            <div className="space-y-0.5">
              {conflictedPaths.map((path) => (
                <ConflictFileRow
                  key={path}
                  path={path}
                  selected={selectedFile === path}
                  onSelect={() => setSelectedConflictFile(path)}
                />
              ))}
            </div>
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
                />
              ))}
            </div>
          )}
        </div>

        <div className="mb-3">
          <h3 className="mb-1 text-[11px] font-semibold text-gf-fg-subtle">
            Resolved Files ({resolvedPaths.length})
          </h3>
          {resolvedPaths.length === 0 ? (
            <p className="text-xs text-gf-fg-subtle">—</p>
          ) : viewMode === 'path' ? (
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
