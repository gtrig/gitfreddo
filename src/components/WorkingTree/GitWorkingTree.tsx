import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useWorkingStatus, useRepoStatus } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useInvalidateGit } from '@/hooks/useInvalidateGit'
import { useToastStore } from '@/stores/toast'
import type { GitFileChange } from '@/lib/types'
import { buildFileTree, collectFolderPaths } from '@/lib/workspace/fileTree'
import { LoadingRow } from '@/components/Ui/Spinner'
import { AnalyzeChangesWithAi } from '@/components/WorkingTree/AnalyzeChangesWithAi'
import { CommitPanel } from '@/components/WorkingTree/CommitPanel'
import { CleanUntrackedModal } from '@/components/WorkingTree/CleanUntrackedModal'
import { ConfirmDialog } from '@/components/Ui/Modal'
import { RenameFileModal } from '@/components/WorkingTree/RenameFileModal'
import { ContextMenu } from '@/components/Ui/ContextMenu'
import { useContextMenu } from '@/hooks/useContextMenu'
import { discardablePaths, pathsUnderFolderPrefix } from '@/lib/workspace/workingTreePaths'
import {
  WorkingTreeActionButton,
  FileRow,
  TreeNode,
  toTreeItems
} from '@/components/WorkingTree/WorkingTreeFileRow'
import { FILE_ROW_HEIGHT, VIRTUAL_OVERSCAN, shouldVirtualize } from '@/lib/ui/virtualList'


export function GitWorkingTree() {
  const { t } = useTranslation()
  const stageLabel = t('workingTree.stage')
  const unstageLabel = t('workingTree.unstage')
  const connected = useWorkspaceStore((s) => s.connected)
  const activePath = useWorkspaceStore((s) => s.activePath)
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace)
  const { data, isLoading, error } = useWorkingStatus(connected)
  const { data: repoStatus } = useRepoStatus(connected)
  const {
    stageAdd,
    stageReset,
    workingDiscard,
    workingRemove,
    workingAddToGitignore,
    submoduleUpdate,
    submoduleSync
  } = useGitMutations()
  const invalidate = useInvalidateGit()
  const showToast = useToastStore((s) => s.show)
  const selectedFile = useSelectionStore((s) => s.selectedWorkingFile)
  const setSelectedWorkingFile = useSelectionStore((s) => s.setSelectedWorkingFile)
  const openFileHistory = useSelectionStore((s) => s.openFileHistory)
  const [viewMode, setViewMode] = useState<'path' | 'tree'>('tree')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const unstagedScrollRef = useRef<HTMLDivElement>(null)
  const stagedScrollRef = useRef<HTMLDivElement>(null)
  const [pendingDiscard, setPendingDiscard] = useState<{ paths: string[]; staged: boolean } | null>(
    null
  )
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [cleanOpen, setCleanOpen] = useState(false)
  const [renamePath, setRenamePath] = useState<string | null>(null)
  const { state: menuState, openMenu, closeMenu } = useContextMenu()

  const gitOpInProgress = Boolean(
    data?.mergeInProgress || data?.rebaseInProgress || data?.cherryPickInProgress
  )

  const changesFiles = [
    ...(data?.unstaged ?? []),
    ...(data?.untracked ?? []),
    ...(!gitOpInProgress ? (data?.conflicted ?? []) : [])
  ]
  const stagedFiles = data?.staged ?? []
  const unstagedPaths = useMemo(
    () => changesFiles.map((file) => file.path),
    [changesFiles]
  )
  const stagedPaths = useMemo(() => stagedFiles.map((file) => file.path), [stagedFiles])
  const unstagedDiscardable = discardablePaths(data?.unstaged ?? [])
  const stagedDiscardable = discardablePaths(stagedFiles)
  const totalChangeCount =
    (data?.unstaged.length ?? 0) +
    (data?.untracked.length ?? 0) +
    (!gitOpInProgress ? (data?.conflicted.length ?? 0) : 0) +
    (data?.staged.length ?? 0)

  const unstagedVirtualizer = useVirtualizer({
    count: viewMode === 'path' && shouldVirtualize(changesFiles.length) ? changesFiles.length : 0,
    getScrollElement: () => unstagedScrollRef.current,
    estimateSize: () => FILE_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  const stagedVirtualizer = useVirtualizer({
    count: viewMode === 'path' && shouldVirtualize(stagedFiles.length) ? stagedFiles.length : 0,
    getScrollElement: () => stagedScrollRef.current,
    estimateSize: () => FILE_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  function expandAllFolders() {
    const paths = new Set<string>()
    for (const path of collectFolderPaths(buildFileTree(toTreeItems(changesFiles)))) {
      paths.add(path)
    }
    for (const path of collectFolderPaths(buildFileTree(toTreeItems(stagedFiles)))) {
      paths.add(path)
    }
    setExpandedPaths(paths)
  }

  function requestDiscard(path: string, staged: boolean) {
    setPendingDiscard({ paths: [path], staged })
  }

  function requestBulkDiscard(paths: string[], staged: boolean) {
    if (paths.length === 0) return
    setPendingDiscard({ paths, staged })
  }

  function requestFolderDiscard(folderPath: string, files: GitFileChange[], staged: boolean) {
    const inFolder = pathsUnderFolderPrefix(files, folderPath)
    const paths = discardablePaths(files.filter((file) => inFolder.includes(file.path)))
    requestBulkDiscard(paths, staged)
  }

  function requestFolderStage(folderPath: string, files: GitFileChange[], staged: boolean) {
    const paths = pathsUnderFolderPrefix(files, folderPath)
    if (paths.length === 0) return
    if (staged) {
      void stageReset.mutateAsync({ paths })
    } else {
      void stageAdd.mutateAsync({ paths })
    }
  }

  function requestDelete(path: string) {
    setPendingDelete(path)
  }

  function requestRemove(path: string) {
    setPendingRemove(path)
  }

  function requestAddToGitignore(path: string, directory = false) {
    void workingAddToGitignore
      .mutateAsync({ path, directory })
      .then(() => {
        showToast(
          t(directory ? 'workingTree.addedPathToGitignore' : 'workingTree.addedToGitignore', {
            path
          }),
          'success'
        )
      })
      .catch((error) => {
        showToast(error instanceof Error ? error.message : String(error), 'error')
      })
  }

  async function openSubmodule(path: string) {
    if (!repoStatus?.root) return
    const absolute = await window.gitfreddo.normalizeRepoPath(
      `${repoStatus.root.replace(/[/\\]+$/, '')}/${path}`
    )
    const tabs = useWorkspaceStore.getState().tabs
    const existing = tabs.find((tab) => tab.path === absolute)
    if (existing) {
      await useWorkspaceStore.getState().switchWorkspace(absolute)
    } else {
      await openWorkspace(absolute)
    }
  }

  function updateSubmodule(path: string) {
    void submoduleUpdate.mutateAsync({ paths: [path], init: true })
  }

  function syncSubmodule(path: string) {
    void submoduleSync.mutateAsync({ paths: [path] })
  }

  const busy =
    stageAdd.isPending ||
    stageReset.isPending ||
    workingDiscard.isPending ||
    workingRemove.isPending ||
    workingAddToGitignore.isPending ||
    deleteBusy

  if (!connected) {
    return <p className="p-4 text-sm text-gf-fg-subtle">{t('workingTree.openRepoPrompt')}</p>
  }

  if (isLoading) return <div className="p-4"><LoadingRow /></div>
  if (error) return <p className="text-sm text-red-400 p-4">{(error as Error).message}</p>

  const renderSection = (
    title: string,
    files: GitFileChange[],
    mode: 'working' | 'staged',
    canStage: boolean,
    headerActions?: ReactNode,
    sectionScrollRef?: React.RefObject<HTMLDivElement | null>,
    sectionVirtualizer?: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>
  ) => (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold text-gf-fg-subtle">
          {title} ({files.length})
        </h3>
        {headerActions}
      </div>
      {files.length === 0 ? (
        <p className="text-xs text-gf-fg-subtle">—</p>
      ) : (
        <>
          {viewMode === 'path' ? (
            sectionVirtualizer && sectionScrollRef && sectionVirtualizer.options.count > 0 ? (
              <div
                ref={sectionScrollRef as React.RefObject<HTMLDivElement>}
                className="overflow-y-auto"
                style={{ maxHeight: '40vh' }}
              >
                <div style={{ height: sectionVirtualizer.getTotalSize(), position: 'relative' }}>
                  {sectionVirtualizer.getVirtualItems().map((virtualItem) => {
                    const file = files[virtualItem.index]!
                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute', top: 0, left: 0, width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`
                        }}
                      >
                        <FileRow
                          file={file}
                          selected={selectedFile === file.path}
                          mode={mode}
                          onSelect={() => setSelectedWorkingFile(file.path, mode)}
                          onStage={
                            canStage
                              ? () => void stageAdd.mutateAsync({ paths: [file.path] })
                              : () => void stageReset.mutateAsync({ paths: [file.path] })
                          }
                          onDiscard={() => requestDiscard(file.path, mode === 'staged')}
                          onRemove={
                            file.status !== 'untracked' && file.status !== 'conflicted'
                              ? () => requestRemove(file.path)
                              : undefined
                          }
                          onDelete={
                            file.status === 'untracked' ? () => requestDelete(file.path) : undefined
                          }
                          onRename={() => setRenamePath(file.path)}
                          onFileHistory={() => openFileHistory(file.path)}
                          onAddToGitignore={() => requestAddToGitignore(file.path)}
                          onOpenSubmodule={
                            file.isSubmodule ? () => void openSubmodule(file.path) : undefined
                          }
                          onUpdateSubmodule={
                            file.isSubmodule ? () => updateSubmodule(file.path) : undefined
                          }
                          onSyncSubmodule={file.isSubmodule ? () => syncSubmodule(file.path) : undefined}
                          openMenu={openMenu}
                          repoPath={activePath}
                          stageLabel={stageLabel}
                          unstageLabel={unstageLabel}
                          t={t}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {files.map((file) => (
                  <FileRow
                    key={file.path}
                    file={file}
                    selected={selectedFile === file.path}
                    mode={mode}
                    onSelect={() => setSelectedWorkingFile(file.path, mode)}
                    onStage={
                      canStage
                        ? () => void stageAdd.mutateAsync({ paths: [file.path] })
                        : () => void stageReset.mutateAsync({ paths: [file.path] })
                    }
                    onDiscard={() => requestDiscard(file.path, mode === 'staged')}
                    onRemove={
                      file.status !== 'untracked' && file.status !== 'conflicted'
                        ? () => requestRemove(file.path)
                        : undefined
                    }
                    onDelete={
                      file.status === 'untracked' ? () => requestDelete(file.path) : undefined
                    }
                    onRename={() => setRenamePath(file.path)}
                    onFileHistory={() => openFileHistory(file.path)}
                    onAddToGitignore={() => requestAddToGitignore(file.path)}
                    onOpenSubmodule={
                      file.isSubmodule ? () => void openSubmodule(file.path) : undefined
                    }
                    onUpdateSubmodule={
                      file.isSubmodule ? () => updateSubmodule(file.path) : undefined
                    }
                    onSyncSubmodule={file.isSubmodule ? () => syncSubmodule(file.path) : undefined}
                    openMenu={openMenu}
                    repoPath={activePath}
                    stageLabel={stageLabel}
                    unstageLabel={unstageLabel}
                    t={t}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="space-y-0.5">
              {buildFileTree(toTreeItems(files))
                .children.map((node) => (
                  <TreeNode
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedWorkingFile}
                    expandedPaths={expandedPaths}
                    toggleExpanded={(path) =>
                      setExpandedPaths((current) => {
                        const next = new Set(current)
                        if (next.has(path)) next.delete(path)
                        else next.add(path)
                        return next
                      })
                    }
                    pathToFile={new Map(files.map((f) => [f.path, f]))}
                    mode={mode}
                    onStage={
                      canStage
                        ? (path) => void stageAdd.mutateAsync({ paths: [path] })
                        : (path) => void stageReset.mutateAsync({ paths: [path] })
                    }
                    onDiscard={requestDiscard}
                    onDelete={requestDelete}
                    onRemove={requestRemove}
                    onDiscardFolder={(folderPath) =>
                      requestFolderDiscard(folderPath, files, mode === 'staged')
                    }
                    onStageFolder={(folderPath) =>
                      requestFolderStage(folderPath, files, mode === 'staged')
                    }
                    onRename={setRenamePath}
                    onFileHistory={openFileHistory}
                    onAddToGitignore={requestAddToGitignore}
                    onOpenSubmodule={(path) => void openSubmodule(path)}
                    onUpdateSubmodule={updateSubmodule}
                    onSyncSubmodule={syncSubmodule}
                    openMenu={openMenu}
                    repoPath={activePath}
                    stageLabel={stageLabel}
                    unstageLabel={unstageLabel}
                    t={t}
                  />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-gf-bg-deep">
      <div className="flex shrink-0 items-center justify-between border-b border-gf-border px-3 py-2">
        <p className="text-xs text-gf-fg-muted">
          {t('workingTree.fileChanges', { count: totalChangeCount })} on{' '}
          <span className="rounded bg-gf-surface px-1 py-0.5 text-[10px] text-gf-fg">{data?.branch}</span>
        </p>
        <button
          type="button"
          onClick={() => setViewMode((m) => (m === 'path' ? 'tree' : 'path'))}
          className="rounded border border-gf-border-strong px-2 py-0.5 text-[10px] text-gf-fg-subtle hover:bg-gf-surface"
        >
          {viewMode === 'path' ? t('workingTree.path') : t('workingTree.tree')}
        </button>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gf-border px-3 py-2">
        <div>
          {viewMode === 'tree' && totalChangeCount > 0 && (
            <button
              type="button"
              onClick={expandAllFolders}
              className="text-[10px] text-gf-accent-fg hover:text-gf-fg"
            >
              {t('workingTree.expandAll')}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <AnalyzeChangesWithAi
            branch={data?.branch ?? ''}
            stagedPaths={stagedPaths}
            unstagedPaths={unstagedPaths}
            disabled={busy}
          />
          {(data?.untracked.length ?? 0) > 0 && (
            <WorkingTreeActionButton
              variant="clear"
              label={t('workingTree.cleanUntracked')}
              disabled={busy}
              onClick={() => setCleanOpen(true)}
            />
          )}
          {data && !data.isClean && changesFiles.length > 0 && (
            <WorkingTreeActionButton
              variant="stage"
              label={t('workingTree.stageAll')}
              disabled={busy}
              loading={stageAdd.isPending}
              onClick={() => void stageAdd.mutateAsync({ paths: [] })}
            />
          )}
          {stagedFiles.length > 0 && (
            <WorkingTreeActionButton
              variant="unstage"
              label={t('workingTree.unstageAll')}
              disabled={busy}
              loading={stageReset.isPending}
              onClick={() => void stageReset.mutateAsync({})}
            />
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {renderSection(
          t('workingTree.changes'),
          changesFiles,
          'working',
          true,
          unstagedDiscardable.length > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => requestBulkDiscard(unstagedDiscardable, false)}
              className="text-[10px] text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              {t('workingTree.discardAll')}
            </button>
          ) : undefined,
          unstagedScrollRef,
          unstagedVirtualizer
        )}
        <div className="my-4 border-t border-gf-border/70" />
        {renderSection(
          t('workingTree.staged'),
          stagedFiles,
          'staged',
          false,
          <div className="flex items-center gap-1">
            {stagedDiscardable.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => requestBulkDiscard(stagedDiscardable, true)}
                className="text-[10px] text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                {t('workingTree.discardAll')}
              </button>
            )}
          </div>,
          stagedScrollRef,
          stagedVirtualizer
        )}
      </div>
      {data && <CommitPanel working={data} />}

      {menuState && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={menuState.items}
          onClose={closeMenu}
        />
      )}

      <CleanUntrackedModal open={cleanOpen} onClose={() => setCleanOpen(false)} />

      {renamePath && (
        <RenameFileModal
          open
          oldPath={renamePath}
          onClose={() => setRenamePath(null)}
        />
      )}

      {pendingDiscard && (
        <ConfirmDialog
          open
          title={t('workingTree.discardChanges')}
          message={
            pendingDiscard.paths.length === 1
              ? t('workingTree.discardChangesOne', { path: pendingDiscard.paths[0] })
              : t('workingTree.discardChangesMany', { count: pendingDiscard.paths.length })
          }
          confirmLabel={t('workingTree.discard')}
          busy={workingDiscard.isPending}
          onConfirm={async () => {
            await workingDiscard.mutateAsync({
              paths: pendingDiscard.paths,
              staged: pendingDiscard.staged
            })
            setPendingDiscard(null)
          }}
          onCancel={() => setPendingDiscard(null)}
        />
      )}

      {pendingRemove && (
        <ConfirmDialog
          open
          title={t('workingTree.removeFromRepo')}
          message={t('workingTree.removeFromRepoMessage', { path: pendingRemove })}
          confirmLabel={t('workingTree.remove')}
          busy={workingRemove.isPending}
          onConfirm={async () => {
            await workingRemove.mutateAsync({ paths: [pendingRemove] })
            setPendingRemove(null)
          }}
          onCancel={() => setPendingRemove(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          open
          title={t('workingTree.deleteFile')}
          message={t('workingTree.deleteFileMessage', { path: pendingDelete })}
          confirmLabel={t('common.delete')}
          busy={deleteBusy}
          onConfirm={async () => {
            setDeleteBusy(true)
            try {
              await window.gitfreddo.deleteWorkspaceFile(pendingDelete, activePath ?? undefined)
              invalidate('working.status')
              setPendingDelete(null)
            } finally {
              setDeleteBusy(false)
            }
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
